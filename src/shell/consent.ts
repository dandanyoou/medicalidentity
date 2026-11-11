/**
 * 동의 기록 — 이용약관·개인정보처리방침 동의와 건강정보(민감정보) 처리 동의.
 *
 * 개인정보보호법 제23조: 건강 정보는 민감정보라 별도 동의가 필요하다. 그래서 일반
 * 약관 동의와 따로 받고, 언제·어느 버전에 동의했는지 남긴다. 약관을 고치면
 * CONSENT_VERSION을 올려 다시 받는다. 기기에만 저장된다.
 */
const KEY = "medid.consent.v1";

/** 약관·방침 시행일. 문구를 바꾸면 이 날짜를 올린다(= 재동의). */
export const CONSENT_VERSION = "2026-11-09";

export interface ConsentRecord {
  terms: boolean;
  health: boolean;
  at: number;
  version: string;
}

export function readConsent(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<ConsentRecord>;
    if (typeof o.terms !== "boolean" || typeof o.health !== "boolean") return null;
    if (typeof o.at !== "number" || typeof o.version !== "string") return null;
    return { terms: o.terms, health: o.health, at: o.at, version: o.version };
  } catch {
    return null;
  }
}

export function hasConsented(): boolean {
  const c = readConsent();
  return !!c && c.terms && c.health && c.version === CONSENT_VERSION;
}

export function recordConsent(input: { terms: boolean; health: boolean }, at: number = Date.now()): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...input, at, version: CONSENT_VERSION } satisfies ConsentRecord));
  } catch {
    /* no-op */
  }
}

export function resetConsent(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}
