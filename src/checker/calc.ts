// 본인부담상한제 소득분위별 상한액(일반 기준)
//
// 출처: 국민건강보험공단 "본인부담상한제" 안내 페이지
//   https://www.nhis.or.kr/nhis/minwon/wbhapa01000m01.do?mode=view&articleNo=10946900
//   (조회일 2026-10, 2026년 진료분)
// 근거 고시: 보건복지부 고시 제2026-126호
//   "본인부담상한액 기준보험료의 산정기준 등에 관한 고시"
//
// 주의(plan-eng-review D2):
// - 이 표는 "일반" 기준만 포함한다. 요양병원 120일 초과 입원 등 특례 기준은
//   이번 MVP 범위 밖(간소화) — 결과 화면에서 공식 신청 페이지로 안내한다.
// - 상한액은 매년 갱신된다. 새 연도를 추가할 때는 이 주석의 출처를 다시
//   확인하고 고시 번호를 함께 갱신할 것 — 아래 shape 테스트는 표의 형태만
//   검증하지, 금액이 실제 고시와 일치하는지는 검증하지 않는다.

export const SUPPORTED_YEARS = [2026] as const;
// 10분위 상한액(843만원)의 100배 이상 — 1년 본인부담금이 이걸 넘는 입력은
// 현실적으로 자릿수 오타다(Open Questions의 자가입력 신뢰도 문제와 같은 결).
const MAX_PLAUSIBLE_MEDICAL_COST_WON = 1_000_000_000;
export type SupportedYear = (typeof SUPPORTED_YEARS)[number];

export type IncomeTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

interface CapRow {
  tiers: readonly IncomeTier[];
  capAmountWon: number;
}

const CAP_TABLE_2026: readonly CapRow[] = [
  { tiers: [1], capAmountWon: 900_000 },
  { tiers: [2, 3], capAmountWon: 1_120_000 },
  { tiers: [4, 5], capAmountWon: 1_730_000 },
  { tiers: [6, 7], capAmountWon: 3_260_000 },
  { tiers: [8], capAmountWon: 4_460_000 },
  { tiers: [9], capAmountWon: 5_360_000 },
  { tiers: [10], capAmountWon: 8_430_000 },
];

export const CAP_TABLES: Readonly<Record<SupportedYear, readonly CapRow[]>> = {
  2026: CAP_TABLE_2026,
};

export class CheckerInputError extends Error {}

function isSupportedYear(year: number): year is SupportedYear {
  return (SUPPORTED_YEARS as readonly number[]).includes(year);
}

function getCapAmount(year: SupportedYear, tier: IncomeTier): number {
  const row = CAP_TABLES[year].find((r) => r.tiers.includes(tier));
  if (!row) {
    throw new CheckerInputError(`소득분위 ${tier}에 대한 상한액을 찾을 수 없습니다.`);
  }
  return row.capAmountWon;
}

export interface OverageResult {
  capAmountWon: number;
  overageWon: number;
  isOverCap: boolean;
  /**
   * 환급 신청 시효 추정일. 상한액 사후환급은 통상 진료 다음 해 8월경 정산이
   * 시작되고, 그로부터 3년이 시효다. 정확한 기준일은 사례마다 다를 수 있어
   * 추정값이다 — 결과 화면에서 "추정"임을 함께 표시해야 한다(Open Questions
   * 참고, 자가입력 신뢰도와 같은 종류의 한계).
   */
  estimatedApplicationDeadline: Date;
}

export function computeOverage(
  medicalCostWon: number,
  incomeTier: IncomeTier,
  year: number,
): OverageResult {
  if (!Number.isFinite(medicalCostWon) || medicalCostWon < 0) {
    throw new CheckerInputError("의료비는 0 이상의 숫자로 입력해주세요.");
  }
  if (medicalCostWon > MAX_PLAUSIBLE_MEDICAL_COST_WON) {
    // 1년 본인부담금이 10억 원을 넘는 건 거의 항상 자릿수 오타다 — 그대로
    // 계산하면 "9,999,999,990원 환급 가능" 같은 터무니없는 숫자를 보여줘
    // 신뢰를 잃는다. 조용히 틀린 값을 보여주는 것보다 입력을 막는다.
    throw new CheckerInputError(
      "입력하신 금액이 너무 큽니다 — 자릿수를 다시 확인해주세요.",
    );
  }
  if (!Number.isInteger(incomeTier) || incomeTier < 1 || incomeTier > 10) {
    throw new CheckerInputError("소득분위는 1~10 사이의 정수여야 합니다.");
  }
  if (!isSupportedYear(year)) {
    throw new CheckerInputError(
      `${year}년 진료분은 아직 지원하지 않습니다. 지원 연도: ${SUPPORTED_YEARS.join(", ")}`,
    );
  }

  const capAmountWon = getCapAmount(year, incomeTier as IncomeTier);
  const overageWon = Math.max(0, medicalCostWon - capAmountWon);

  // month은 0-인덱스이므로 7 = 8월.
  const estimatedApplicationDeadline = new Date(year + 1 + 3, 7, 1);

  return {
    capAmountWon,
    overageWon,
    isOverCap: overageWon > 0,
    estimatedApplicationDeadline,
  };
}
