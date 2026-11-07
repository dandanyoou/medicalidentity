/**
 * 예약 → 캘린더(.ics) 이벤트. 병원 연동 없이도 실제로 동작하는 부분 —
 * 사용자가 자기 캘린더에 진료 일정을 넣어둘 수 있다.
 */
export interface BookingEvent {
  hospital: string;
  dept: string;
  date: string; // YYYY-MM-DD
  slot: string; // "오늘 15:30" 같은 시연 슬롯 — 시각만 쓴다
  reason?: string;
}

/** "오늘 15:30" → "1530". 시각이 없으면 09:00. */
export function slotToTime(slot: string): string {
  const m = slot.match(/(\d{1,2}):(\d{2})/);
  if (!m) return "0900";
  return `${m[1].padStart(2, "0")}${m[2]}`;
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function addMinutes(hhmm: string, minutes: number): string {
  const h = Number(hhmm.slice(0, 2));
  const m = Number(hhmm.slice(2));
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}${String(total % 60).padStart(2, "0")}`;
}

export function buildICS(ev: BookingEvent): string {
  const ymd = ev.date.replace(/-/g, "");
  const start = slotToTime(ev.slot);
  const end = addMinutes(start, 30);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//가족 의료지갑//booking//KO",
    "BEGIN:VEVENT",
    `UID:${ymd}T${start}-${encodeURIComponent(ev.hospital)}@medid`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=Asia/Seoul:${ymd}T${start}00`,
    `DTEND;TZID=Asia/Seoul:${ymd}T${end}00`,
    `SUMMARY:${escapeText(`${ev.hospital} ${ev.dept} 진료`)}`,
    `LOCATION:${escapeText(ev.hospital)}`,
    ...(ev.reason ? [`DESCRIPTION:${escapeText(ev.reason)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

/** 브라우저에서 .ics 파일로 내려받기. */
export function downloadICS(ev: BookingEvent): void {
  const blob = new Blob([buildICS(ev)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${ev.hospital}-${ev.date}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
