import { describe, expect, it } from "vitest";
import { computeReviewStats } from "./reviewStats";
import type { Visit } from "../visits/store";

function v(review?: Visit["doctorReview"]): Visit {
  return {
    id: Math.random().toString(36).slice(2),
    memberId: "self",
    hospital: "A",
    dept: "가정의학과",
    date: "2026-11-09",
    reason: "r",
    amount: 0,
    paid: false,
    status: "예약",
    ...(review ? { doctorReview: review } : {}),
  };
}

describe("computeReviewStats — 의사 확인 집계", () => {
  it("맞음·다른 과·보류를 세고, 정확도는 보류를 빼고 계산한다", () => {
    const s = computeReviewStats([
      v({ verdict: "맞음", recommended: ["가정의학과"], at: 1 }),
      v({ verdict: "맞음", recommended: ["가정의학과", "신경과"], at: 2 }),
      v({ verdict: "다른 과", actualDept: "정형외과", recommended: ["가정의학과"], at: 3 }),
      v({ verdict: "보류", recommended: ["내과"], at: 4 }),
      v(), // 확인 안 함
    ]);
    expect(s).toEqual({
      reviewed: 4,
      correct: 2,
      other: 1,
      hold: 1,
      accuracy: 67,
      mismatches: [{ recommended: "가정의학과", actual: "정형외과", count: 1 }],
    });
  });

  it("판정이 하나도 없으면 정확도는 null", () => {
    expect(computeReviewStats([v(), v({ verdict: "보류", recommended: [], at: 1 })]).accuracy).toBeNull();
  });
});
