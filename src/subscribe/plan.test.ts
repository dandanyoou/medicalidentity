// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FAMILY_PREMIUM, isPremium, setPremium, clearPremium } from "./plan";

beforeEach(() => clearPremium());
afterEach(() => clearPremium());

describe("subscribe plan", () => {
  it("가족 프리미엄 플랜 정보가 정의돼 있다", () => {
    expect(FAMILY_PREMIUM.priceMonthly).toBeGreaterThan(0);
    expect(FAMILY_PREMIUM.features.length).toBeGreaterThan(0);
  });

  it("기본은 미구독, 구독 처리하면 프리미엄이 된다", () => {
    expect(isPremium()).toBe(false);
    setPremium(true);
    expect(isPremium()).toBe(true);
    setPremium(false);
    expect(isPremium()).toBe(false);
  });
});
