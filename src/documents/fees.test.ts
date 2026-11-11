// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_FEES, FEE_CAPS, FEES_KEY, getFees, setFee } from "./fees";

beforeEach(() => localStorage.clear());

describe("제증명 수수료 설정 — 병원이 상한 안에서 정한다(시연)", () => {
  it("기본값: 진단서·소견서는 안(가정) 금액, 처방전 사본·영수증은 0원", () => {
    expect(getFees()).toEqual(DEFAULT_FEES);
    expect(DEFAULT_FEES["처방전 사본"]).toBe(0);
    expect(DEFAULT_FEES["진료비 영수증"]).toBe(0);
    expect(DEFAULT_FEES["진단서"]).toBeGreaterThan(0);
  });

  it("상한(고시 확인 필요)을 넘기거나 음수·소수는 받지 않는다", () => {
    expect(FEE_CAPS["진단서"]).toBeGreaterThan(0);
    expect(() => setFee("진단서", FEE_CAPS["진단서"] + 1)).toThrow(/상한/);
    expect(() => setFee("진단서", -1)).toThrow();
    expect(() => setFee("진단서", 1234.5)).toThrow();
  });

  it("바꾼 값은 기기 저장소(medid.*)에 남고 다시 읽힌다", () => {
    setFee("진단서", 15_000);
    expect(getFees()["진단서"]).toBe(15_000);
    expect(FEES_KEY.startsWith("medid.")).toBe(true);
    localStorage.setItem(FEES_KEY, "{broken");
    expect(getFees()).toEqual(DEFAULT_FEES);
  });
});
