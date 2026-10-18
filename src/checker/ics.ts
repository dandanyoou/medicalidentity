// .ics(iCalendar, RFC5545) 캘린더 이벤트 생성 + 다운로드 트리거.
//
// 서버·백엔드 없이 클라이언트에서만 동작해야 하므로(Constraints 참고) 외부
// 캘린더 라이브러리를 추가하지 않고 단일 VEVENT 텍스트를 직접 만든다
// (Reuse ladder: 한 종류의 고정 이벤트에는 라이브러리보다 템플릿 문자열이
// 더 단순하다).
//
// 주의(plan-eng-review Failure modes): 카카오톡 인앱 브라우저 등 일부
// WebView는 Blob 다운로드를 조용히 무시할 수 있다. 이 모듈은 다운로드
// *시도*만 책임지며, 실패를 감지하지 못한다 — 호출 쪽(CheckerScreen.tsx)이
// 항상 "다운로드가 안 되면 날짜를 직접 추가하세요: {날짜}" 대체 텍스트를
// 함께 보여줘야 한다(T3).

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** VALUE=DATE 형식(YYYYMMDD)으로 날짜만 인코딩한다(시간대 모호성 회피). */
export function formatIcsDate(date: Date): string {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
}

/** RFC5545 TEXT 값 이스케이프: backslash, 세미콜론, 쉼표, 줄바꿈. */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export interface IcsEventOptions {
  summary: string;
  description?: string;
  date: Date;
  /** UID가 없으면 summary+date로 결정적으로 만든다(테스트 안정성). */
  uid?: string;
}

export function buildIcsEvent(options: IcsEventOptions): string {
  const dateStamp = formatIcsDate(options.date);
  const uid = options.uid ?? `checker-${dateStamp}-${escapeIcsText(options.summary)}@medicalidentity`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//medicalidentity//checker//KO",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dateStamp}T000000Z`,
    `DTSTART;VALUE=DATE:${dateStamp}`,
    `SUMMARY:${escapeIcsText(options.summary)}`,
  ];

  if (options.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(options.description)}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  // RFC5545은 CRLF 줄바꿈을 요구한다.
  return lines.join("\r\n");
}

/**
 * 생성된 .ics 텍스트를 브라우저 다운로드로 트리거한다. 성공 여부를
 * 반환하지 않는다 — 대부분의 브라우저는 다운로드 성공/실패를 JS에
 * 알려주지 않기 때문이다(Failure modes 참고, T3에서 UI 대체 수단 제공).
 */
export function triggerIcsDownload(filename: string, icsContent: string): void {
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // 너무 빨리 revoke하면 일부 브라우저에서 다운로드 자체가 취소된다 —
  // 다운로드가 시작될 시간을 주고 나서 해제한다.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
