import { describe, expect, it } from "vitest";
import { CAP_TABLES, CheckerInputError, computeOverage, SUPPORTED_YEARS } from "./calc";

describe("computeOverage", () => {
  it("초과 케이스: 의료비가 상한액보다 많으면 초과액을 반환한다", () => {
    const result = computeOverage(2_000_000, 1, 2026);
    expect(result.capAmountWon).toBe(900_000);
    expect(result.overageWon).toBe(1_100_000);
    expect(result.isOverCap).toBe(true);
  });

  it("미초과 케이스: 의료비가 상한액보다 적으면 초과액은 0이다", () => {
    const result = computeOverage(500_000, 1, 2026);
    expect(result.overageWon).toBe(0);
    expect(result.isOverCap).toBe(false);
  });

  it("경계값: 의료비가 상한액과 정확히 같으면 초과가 아니다", () => {
    const result = computeOverage(900_000, 1, 2026);
    expect(result.overageWon).toBe(0);
    expect(result.isOverCap).toBe(false);
  });

  it("경계값: 의료비가 상한액보다 1원 많으면 초과다", () => {
    const result = computeOverage(900_001, 1, 2026);
    expect(result.overageWon).toBe(1);
    expect(result.isOverCap).toBe(true);
  });

  it.each([2, 3])("묶음 분위(2~3분위)는 같은 상한액을 공유한다: 분위 %i", (tier) => {
    const result = computeOverage(2_000_000, tier as 2 | 3, 2026);
    expect(result.capAmountWon).toBe(1_120_000);
  });

  it("잘못된 소득분위(0)는 CheckerInputError를 던진다", () => {
    expect(() => computeOverage(1_000_000, 0 as never, 2026)).toThrow(CheckerInputError);
  });

  it("잘못된 소득분위(11)는 CheckerInputError를 던진다", () => {
    expect(() => computeOverage(1_000_000, 11 as never, 2026)).toThrow(CheckerInputError);
  });

  it("음수 의료비는 CheckerInputError를 던진다", () => {
    expect(() => computeOverage(-1, 1, 2026)).toThrow(CheckerInputError);
  });

  it("비정상 숫자(NaN) 의료비는 CheckerInputError를 던진다", () => {
    expect(() => computeOverage(Number.NaN, 1, 2026)).toThrow(CheckerInputError);
  });

  it("비현실적으로 큰 의료비(자릿수 오타 의심)는 CheckerInputError를 던진다", () => {
    expect(() => computeOverage(10_000_000_000, 1, 2026)).toThrow(CheckerInputError);
  });

  it("10억 원은 아직 허용 범위(경계값)다", () => {
    expect(() => computeOverage(1_000_000_000, 1, 2026)).not.toThrow();
  });

  it("지원하지 않는 연도는 CheckerInputError를 던진다", () => {
    expect(() => computeOverage(1_000_000, 1, 2020)).toThrow(CheckerInputError);
    expect(() => computeOverage(1_000_000, 1, 2030)).toThrow(CheckerInputError);
  });

  it("시효 추정일은 진료연도+4년 8월 1일이다", () => {
    const result = computeOverage(1_000_000, 1, 2026);
    expect(result.estimatedApplicationDeadline.getFullYear()).toBe(2030);
    expect(result.estimatedApplicationDeadline.getMonth()).toBe(7);
  });
});

describe("CAP_TABLE shape (plan-eng-review D2 — 표 검증, 값 정확성은 사람이 출처 주석과 대조해야 함)", () => {
  it.each(SUPPORTED_YEARS)("연도 %i의 표는 소득분위 1~10을 빠짐없이 1회씩 포함한다", (year) => {
    const coveredTiers = CAP_TABLES[year].flatMap((row) => row.tiers);
    const sorted = [...coveredTiers].sort((a, b) => a - b);
    expect(sorted).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it.each(SUPPORTED_YEARS)("연도 %i의 표는 분위가 올라갈수록 상한액도 올라간다(단조증가)", (year) => {
    const rows = CAP_TABLES[year];
    for (let i = 1; i < rows.length; i += 1) {
      expect(rows[i].capAmountWon).toBeGreaterThan(rows[i - 1].capAmountWon);
    }
  });
});
