/**
 * 진료 후 병원 평가(R8·H3) — 1~5점 + 한 줄, 기기 저장.
 *
 * 외부 지도 별점은 약관·비용 때문에 못 가져온다. 대신 우리 사용자가 수납을 마친 뒤 남긴 평가를
 * 쌓고, 병원별 표본이 RATING_MIN_COUNT 이상일 때만 "이용자 평가순"에 쓴다. 표본이 적으면
 * 숨긴다(소수 평가로 병원 순위를 흔들지 않기 위해). 병원에 대가를 받고 순위를 바꾸는 일은 없다.
 */
export const RATINGS_KEY = "medid.ratings";
export const RATING_MIN_COUNT = 10;
export const COMMENT_MAX = 80;

export interface Rating {
  visitId: string;
  hospital: string;
  score: number; // 1~5
  comment: string;
  at: string;
}

export interface HospitalRating {
  avg: number;
  count: number;
  /** 표본이 최소치 이상이라 정렬·표시에 써도 되는가 */
  eligible: boolean;
}

export function listRatings(): Rating[] {
  try {
    const raw = localStorage.getItem(RATINGS_KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter(isRating) : [];
  } catch {
    return [];
  }
}

function isRating(v: unknown): v is Rating {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.visitId === "string" &&
    typeof o.hospital === "string" &&
    typeof o.score === "number" &&
    Number.isInteger(o.score) &&
    o.score >= 1 &&
    o.score <= 5 &&
    typeof o.comment === "string" &&
    typeof o.at === "string"
  );
}

export function getRating(visitId: string): Rating | undefined {
  return listRatings().find((r) => r.visitId === visitId);
}

export function rateVisit(visitId: string, hospital: string, input: { score: number; comment: string }): Rating {
  if (!Number.isInteger(input.score) || input.score < 1 || input.score > 5) throw new Error("점수는 1~5점이에요.");
  const comment = input.comment.trim();
  if (comment.length > COMMENT_MAX) throw new Error(`한 줄은 ${COMMENT_MAX}자까지예요.`);
  const r: Rating = { visitId, hospital, score: input.score, comment, at: new Date().toISOString() };
  const rest = listRatings().filter((x) => x.visitId !== visitId);
  localStorage.setItem(RATINGS_KEY, JSON.stringify([...rest, r]));
  return r;
}

/** 병원별 평균·건수. 이름은 방문 기록의 요양기관명과 같다. */
export function hospitalRatings(min: number = RATING_MIN_COUNT): Map<string, HospitalRating> {
  const acc = new Map<string, { sum: number; count: number }>();
  for (const r of listRatings()) {
    const cur = acc.get(r.hospital) ?? { sum: 0, count: 0 };
    cur.sum += r.score;
    cur.count += 1;
    acc.set(r.hospital, cur);
  }
  const out = new Map<string, HospitalRating>();
  for (const [name, { sum, count }] of acc) out.set(name, { avg: sum / count, count, eligible: count >= min });
  return out;
}
