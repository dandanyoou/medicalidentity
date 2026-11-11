/**
 * 알림 설정 — 사용자 선호 저장.
 *
 * 정직: 실제 푸시 알림은 앱 설치(PWA) + 알림 권한 + 푸시 서버가 있어야 동작한다.
 * 지금은 선호만 저장하고, 푸시 서버 연동 전까지는 "준비 중"으로 표시한다.
 */
const KEY = "medid.settings.v1";

export interface Settings {
  unpaidAlert: boolean; // 병원 이탈 시 미납 알림
  bookingReminder: boolean; // 예약 전날 리마인더
  refundAutoCheck: boolean; // 매년 환급 자동 재확인(프리미엄)
}

export const DEFAULT_SETTINGS: Settings = {
  unpaidAlert: true,
  bookingReminder: true,
  refundAutoCheck: false,
};

export function getSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Settings {
  const next = { ...getSettings(), [key]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* no-op */
  }
  return next;
}

export function resetSettings(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}
