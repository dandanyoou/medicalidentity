import type { Visit } from "../visits/store";

export interface ReviewStats {
  reviewed: number;
  correct: number;
  other: number;
  hold: number;
  /** 맞음 / (맞음 + 다른 과). 판정이 없으면 null. 보류는 뺀다. */
  accuracy: number | null;
  /** "추천 → 실제" 불일치 쌍, 많은 순. */
  mismatches: { recommended: string; actual: string; count: number }[];
}

/** 의사 확인 집계 — 추천 진료과가 실제로 맞았는지. 규칙을 고칠 근거가 된다. */
export function computeReviewStats(visits: Visit[]): ReviewStats {
  let correct = 0;
  let other = 0;
  let hold = 0;
  const pairs = new Map<string, { recommended: string; actual: string; count: number }>();
  for (const v of visits) {
    const r = v.doctorReview;
    if (!r) continue;
    if (r.verdict === "맞음") correct++;
    else if (r.verdict === "보류") hold++;
    else {
      other++;
      const recommended = r.recommended[0] ?? "(없음)";
      const actual = r.actualDept ?? "(미입력)";
      const key = `${recommended}→${actual}`;
      const cur = pairs.get(key) ?? { recommended, actual, count: 0 };
      cur.count++;
      pairs.set(key, cur);
    }
  }
  const judged = correct + other;
  return {
    reviewed: correct + other + hold,
    correct,
    other,
    hold,
    accuracy: judged > 0 ? Math.round((correct / judged) * 100) : null,
    mismatches: [...pairs.values()].sort((a, b) => b.count - a.count),
  };
}
