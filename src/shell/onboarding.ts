/** 첫 실행 온보딩 — 한 번 본 뒤엔 바로 홈으로. */
const KEY = "medid.onboarded.v1";

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markOnboarded(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* no-op */
  }
}

export function resetOnboarding(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}
