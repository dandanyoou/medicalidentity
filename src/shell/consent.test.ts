// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CONSENT_VERSION, hasConsented, readConsent, recordConsent, resetConsent } from "./consent";

beforeEach(() => resetConsent());
afterEach(() => resetConsent());

describe("동의 기록 — 약관·개인정보처리방침 + 건강정보(민감정보)", () => {
  it("처음엔 동의가 없다", () => {
    expect(hasConsented()).toBe(false);
    expect(readConsent()).toBeNull();
  });

  it("둘 다 동의하면 시각·버전과 함께 저장된다", () => {
    recordConsent({ terms: true, health: true }, 1700000000000);
    expect(hasConsented()).toBe(true);
    expect(readConsent()).toEqual({ terms: true, health: true, at: 1700000000000, version: CONSENT_VERSION });
  });

  it("하나라도 빠지면 동의한 것으로 치지 않는다", () => {
    recordConsent({ terms: true, health: false }, 1);
    expect(hasConsented()).toBe(false);
  });

  it("약관 버전이 바뀌면 다시 받아야 한다", () => {
    localStorage.setItem(
      "medid.consent.v1",
      JSON.stringify({ terms: true, health: true, at: 1, version: "0000-00-00" }),
    );
    expect(hasConsented()).toBe(false);
  });
});
