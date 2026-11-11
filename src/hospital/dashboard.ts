import type { Visit } from "../visits/store";
import { computeReviewStats } from "../doctor/reviewStats";

/**
 * 병원 대시보드 집계 — 병원이 돈을 낼 때 보는 숫자.
 *
 * 전부 이 기기 저장소의 방문 기록에서 센다(시연). 표본이 없으면 null을 돌려주고 화면은
 * "아직 데이터 없음"으로 보여준다. 숫자를 지어내지 않는다.
 */
export interface HospitalStats {
  /** 문진을 마치고 예약한 방문 수 */
  intakeCompleted: number;
  /** 문진 시작~확인 평균 초. 시작 시각이 남은 기록만. 없으면 null */
  avgIntakeSeconds: number | null;
  /** 의사가 "추천 과가 맞았나요?"에 답한 수 */
  reviewed: number;
  /** 맞음 / (맞음 + 다른 과) %. 판정이 없으면 null */
  accuracy: number | null;
  /** 오늘까지 날짜가 된 예약 수(방문율 분모) */
  bookedDue: number;
  /** 그중 실제로 진료가 이뤄진 수(수납대기·완료) */
  visited: number;
  /** visited / bookedDue %. 분모 0이면 null */
  visitRate: number | null;
  /** 서류 발급 수 — 0이면 null */
  documentsIssued: number | null;
}

export function computeHospitalStats(visits: Visit[], opts: { today: string; documentsIssued?: number }): HospitalStats {
  const withIntake = visits.filter((v) => v.intake);
  const durations = withIntake
    .map((v) => v.intake!)
    .filter((r) => typeof r.startedAt === "number" && r.confirmedAt >= r.startedAt!)
    .map((r) => (r.confirmedAt - r.startedAt!) / 1000);
  const avgIntakeSeconds =
    durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;

  const review = computeReviewStats(visits);

  const due = visits.filter((v) => v.date <= opts.today);
  const visited = due.filter((v) => v.status !== "예약").length;

  return {
    intakeCompleted: withIntake.length,
    avgIntakeSeconds,
    reviewed: review.reviewed,
    accuracy: review.accuracy,
    bookedDue: due.length,
    visited,
    visitRate: due.length > 0 ? Math.round((visited / due.length) * 100) : null,
    documentsIssued: (opts.documentsIssued ?? 0) > 0 ? opts.documentsIssued! : null,
  };
}

/** 90 → "1분 30초", 45 → "45초" */
export function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m === 0) return `${r}초`;
  return r === 0 ? `${m}분` : `${m}분 ${r}초`;
}
