// 체커 Success Criteria 계측(plan-eng-review D1, D4, D5).
//
// 이 앱은 백엔드가 없다(Constraints 참고) — Vercel에 이미 배포 중이므로
// 자체 서버리스 함수를 새로 만들지 않고 플랫폼에 내장된
// Vercel Web Analytics 커스텀 이벤트를 쓴다(D1, Layer 1 재사용).
import { track } from "@vercel/analytics/react";

const VISITOR_ID_KEY = "checker_visitor_id";
const FIRED_PREFIX = "checker_fired_";

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    // 일부 프라이빗 모드/임베디드 WebView는 localStorage 접근을 막는다 —
    // 집계만 못 하는 것이고 기능에는 영향 없다.
    return null;
  }
}

/**
 * 브라우저당 익명 UUID. 2주 뒤 재방문(D5) 측정을 위해 모든 이벤트에
 * 커스텀 속성으로 함께 보낸다. 개인정보 아님(기기/브라우저 변경 시
 * 다른 사람으로 집계되는 과소집계 한계는 설계 문서에 명시됨).
 */
export function getOrCreateVisitorId(): string {
  const storage = safeLocalStorage();
  if (!storage) return "unknown";

  const existing = storage.getItem(VISITOR_ID_KEY);
  if (existing) return existing;

  const id = crypto.randomUUID();
  storage.setItem(VISITOR_ID_KEY, id);
  return id;
}

function hasAlreadyFired(eventName: string): boolean {
  return safeLocalStorage()?.getItem(FIRED_PREFIX + eventName) === "1";
}

function markFired(eventName: string): void {
  safeLocalStorage()?.setItem(FIRED_PREFIX + eventName, "1");
}

export type CheckerEventName =
  | "checker_completed"
  | "checker_ics_downloaded"
  | "checker_payment_intent_clicked"
  | "checker_shared";

/**
 * 브라우저당(localStorage) 이벤트 1회만 전송한다 — 중복 클릭·자체 QA가
 * Success Criteria의 작은 숫자(10명, 3명 등)를 왜곡하지 않게 한다(D4).
 * 전송 실패는 삼키고 호출부 동작엔 영향을 주지 않는다 — 다운로드·결제
 * 버튼 등 실제 기능은 집계 실패와 무관하게 정상 동작해야 한다
 * (Failure modes: 집계 손실만 발생, 사용자 영향 없음).
 */
export function trackCheckerEvent(eventName: CheckerEventName): void {
  if (hasAlreadyFired(eventName)) return;
  markFired(eventName);
  try {
    track(eventName, { visitorId: getOrCreateVisitorId() });
  } catch {
    // 집계 실패는 무시.
  }
}
