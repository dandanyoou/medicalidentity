/**
 * 제증명 수수료 — 병원이 종류별로 정한다(시연).
 *
 * 돈의 방향(설계 문서): 환자 → 병원. 지금도 종이로 받을 때 내는 돈이고, 보건복지부의
 * 제증명수수료 상한 고시 안에서 병원이 정한다. 우리는 결제만 대신 받는다(PG 정산은 연동 뒤).
 * 아래 상한 숫자는 고시를 다시 확인해야 한다(변호사·고시 확인 항목) — 코드가 법을 단정하지 않는다.
 */
import type { DocKind } from "./store";

export const FEES_KEY = "medid.hospital.fees";

/** 상한(원) — 고시 확인 필요. 넘기면 저장하지 않는다. */
export const FEE_CAPS: Record<DocKind, number> = {
  진단서: 20_000,
  소견서: 20_000,
  "처방전 사본": 1_000,
  "진료비 영수증": 1_000,
};

/** 기본값(안) — 진단서·소견서는 가정 금액, 사본·영수증은 무료. */
export const DEFAULT_FEES: Record<DocKind, number> = {
  진단서: 10_000,
  소견서: 10_000,
  "처방전 사본": 0,
  "진료비 영수증": 0,
};

export function getFees(): Record<DocKind, number> {
  try {
    const raw = localStorage.getItem(FEES_KEY);
    if (!raw) return { ...DEFAULT_FEES };
    const v = JSON.parse(raw) as Partial<Record<DocKind, unknown>>;
    const out = { ...DEFAULT_FEES };
    for (const k of Object.keys(DEFAULT_FEES) as DocKind[]) {
      const n = v[k];
      if (typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= FEE_CAPS[k]) out[k] = n;
    }
    return out;
  } catch {
    return { ...DEFAULT_FEES };
  }
}

export function setFee(kind: DocKind, won: number) {
  if (!Number.isInteger(won) || won < 0) throw new Error("0원 이상 정수로 적어 주세요.");
  if (won > FEE_CAPS[kind]) throw new Error(`${kind} 수수료는 상한 ${FEE_CAPS[kind].toLocaleString("ko-KR")}원을 넘을 수 없어요(고시 확인 필요).`);
  localStorage.setItem(FEES_KEY, JSON.stringify({ ...getFees(), [kind]: won }));
}
