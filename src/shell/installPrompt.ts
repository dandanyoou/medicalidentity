/**
 * PWA 설치 안내 — 플랫폼별로 "지금 할 수 있는 한 가지"만 보여준다.
 *
 * - installed: 이미 홈 화면 앱(standalone)으로 실행 중
 * - promptable: 브라우저가 beforeinstallprompt를 줬다 → 버튼 한 번에 설치
 * - ios: iOS Safari는 프로그램 설치 불가 → 공유 → 홈 화면에 추가 안내
 * - manual: 그 외 → 브라우저 메뉴에서 홈 화면에 추가 안내
 */
export type InstallState = "installed" | "promptable" | "ios" | "manual";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

/** 앱 부팅 시 한 번 — 브라우저의 설치 프롬프트 이벤트를 붙잡아 둔다. */
export function captureInstallPrompt(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

export function onInstallStateChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mm = typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)");
  const nav = navigator as Navigator & { standalone?: boolean };
  return Boolean((mm && mm.matches) || nav.standalone === true);
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function getInstallState(): InstallState {
  if (isStandalone()) return "installed";
  if (deferred) return "promptable";
  if (isIOS()) return "ios";
  return "manual";
}

/** 설치 프롬프트 띄우기. 사용자가 수락했으면 true. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const ev = deferred;
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  if (outcome === "accepted") deferred = null;
  notify();
  return outcome === "accepted";
}

/** 테스트용 — 붙잡아 둔 이벤트를 비운다. */
export function _resetInstallPrompt(): void {
  deferred = null;
  listeners.clear();
}
