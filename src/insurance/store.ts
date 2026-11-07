/**
 * 실손의료보험 간편청구 — 진료기록(Visit)에서 바로 청구한다.
 *
 * 진료기록이 이미 영수증·진단서·처방전 데이터를 들고 있으니, 매번 서류를 사진
 * 찍어 설계사에게 보내지 않고 여기서 청구를 넣는다.
 *
 * 정직: 실제 보험사 제출은 보험사·실손24(청구 전산화) 연동이 선결이라 제출은
 * '시연'이다. 다만 서류를 진료기록에서 자동으로 모아주는 가치는 진짜다.
 */

const KEY = "medid.claims.v1";

// 주요 실손의료보험 취급 손해보험사.
export const INSURERS = [
  "삼성화재",
  "현대해상",
  "DB손해보험",
  "KB손해보험",
  "메리츠화재",
  "한화손해보험",
  "롯데손해보험",
  "흥국화재",
] as const;

export type ClaimStatus = "접수" | "심사중" | "지급완료";

export interface Claim {
  id: string;
  visitId: string;
  insurer: string;
  status: ClaimStatus;
  createdAt: number;
}

function read(): Claim[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Claim[]) : [];
  } catch {
    return [];
  }
}

function write(claims: Claim[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(claims));
  } catch {
    /* no-op */
  }
}

export function listClaims(): Claim[] {
  return read().sort((a, b) => b.createdAt - a.createdAt);
}

export function getClaimByVisit(visitId: string): Claim | undefined {
  return read().find((c) => c.visitId === visitId);
}

export function addClaim(visitId: string, insurer: string): Claim {
  const claim: Claim = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `claim_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    visitId,
    insurer,
    status: "접수",
    createdAt: Date.now(),
  };
  // 한 방문당 청구 하나(중복 방지) — 기존 청구가 있으면 교체.
  write([claim, ...read().filter((c) => c.visitId !== visitId)]);
  return claim;
}

export function resetClaims(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}
