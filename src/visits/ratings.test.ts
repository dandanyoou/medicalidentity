// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { RATINGS_KEY, RATING_MIN_COUNT, getRating, hospitalRatings, listRatings, rateVisit } from "./ratings";

beforeEach(() => localStorage.clear());

describe("진료 후 병원 평가(R8) — 1~5점 + 한 줄, 기기 저장", () => {
  it("1~5 정수만 받고, 한 줄은 80자까지, 방문당 한 번(덮어쓰기)", () => {
    const r = rateVisit("v1", "행복의원", { score: 5, comment: " 친절했어요 " });
    expect(r).toMatchObject({ visitId: "v1", hospital: "행복의원", score: 5, comment: "친절했어요" });
    expect(r.at).toMatch(/^\d{4}-/);
    expect(() => rateVisit("v2", "행복의원", { score: 0, comment: "" })).toThrow();
    expect(() => rateVisit("v2", "행복의원", { score: 4.5, comment: "" })).toThrow();
    expect(() => rateVisit("v2", "행복의원", { score: 3, comment: "a".repeat(81) })).toThrow(/80/);
    rateVisit("v1", "행복의원", { score: 2, comment: "" });
    expect(listRatings()).toHaveLength(1);
    expect(getRating("v1")?.score).toBe(2);
    expect(RATINGS_KEY.startsWith("medid.")).toBe(true);
  });

  it("병원별 평균·건수를 내고, 건수가 최소치 미만이면 '노출 가능'이 아니다", () => {
    for (let i = 0; i < RATING_MIN_COUNT - 1; i++) rateVisit(`a${i}`, "행복의원", { score: 4, comment: "" });
    let s = hospitalRatings();
    expect(s.get("행복의원")).toMatchObject({ count: RATING_MIN_COUNT - 1, avg: 4, eligible: false });
    rateVisit("last", "행복의원", { score: 5, comment: "" });
    s = hospitalRatings();
    expect(s.get("행복의원")?.eligible).toBe(true);
    expect(s.get("행복의원")?.avg).toBeCloseTo((4 * (RATING_MIN_COUNT - 1) + 5) / RATING_MIN_COUNT, 2);
  });

  it("깨진 저장값은 빈 목록", () => {
    localStorage.setItem(RATINGS_KEY, "{nope");
    expect(listRatings()).toEqual([]);
  });
});
