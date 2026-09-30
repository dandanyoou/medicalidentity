// 마약성 의약품(관리약물) 처방 중복 탐지 + 위변조 방지 로그.
//
// 범위 축소 결정 (eng-review 2026-09-30, D2-D5):
//   - "AI 이상탐지" → 정적 룰 기반 (DDICheck.tsx와 동일한 lookup 매칭 패턴 재사용)
//   - "블록체인" → 간이 해시체인 JSON 로그 (실제 체인 배포 없음)
//   - "병원간 실시간 연동" → 빌드타임 시드 데이터 (백엔드가 없어 실시간 동기화 불가능)
//
// 정직성 노트: 이 모듈은 "탐지"가 아니라 "빌드타임에 이미 정해진 결과를 판정 로직으로
// 재현"한다 — 서로 다른 두 병원이 독립적으로 제출한 데이터에서 실시간으로 찾아내는 게
// 아니다. 발표 시 이 차이를 명시할 것.

import { sha256 } from "@noble/hashes/sha256";
import { existsInLookup } from "../lib/lookup";

export const CONTROLLED_SUBSTANCES = [
  "Oxycodone",
  "Fentanyl",
  "Morphine",
  "Hydrocodone",
  "Tramadol",
] as const;

export interface PriorVisit {
  hospital: string;
  drug: string;
  date: string; // ISO date (YYYY-MM-DD)
}

// 빌드타임 시드 — 실제 병원 연동 아님 (D4). 데모 시연 시점(2026-09) 기준 7일 이내로
// 맞춰둠. 시간이 지나면 날짜를 갱신해야 데모 트리거가 유지된다 — 이미 WalletScreen의
// "최종 갱신 2026-03-10"과 같은 종류의 하드코딩 한계.
export const SEED_PRIOR_VISITS: PriorVisit[] = [
  { hospital: "제일병원", drug: "Oxycodone", date: "2026-09-24" },
  { hospital: "한마음의원", drug: "Oxycodone", date: "2026-09-26" },
  { hospital: "행복내과", drug: "Oxycodone", date: "2026-09-28" },
];

export interface DuplicateCheckResult {
  flagged: boolean;
  reasons: string[];
  matchingVisits: PriorVisit[];
  distinctHospitals: number;
}

/**
 * 정적 룰 2종 (D3):
 *   1. 최근 windowDays일 내 서로 다른 병원 2곳 이상에서 동일 약물 처방 이력
 *      (+ 이번 요청까지 합치면 3곳)
 *   2. 최근 windowDays일 내 동일 약물 3회 이상 반복 요청
 */
export function checkDuplicatePrescription(
  requestedDrug: string,
  priorVisits: PriorVisit[],
  referenceDate: number = Date.now(),
  windowDays = 7,
): DuplicateCheckResult {
  if (!existsInLookup(requestedDrug, { controlled: [...CONTROLLED_SUBSTANCES] })) {
    return { flagged: false, reasons: [], matchingVisits: [], distinctHospitals: 0 };
  }

  const cutoff = referenceDate - windowDays * 24 * 60 * 60 * 1000;
  const matchingVisits = priorVisits.filter(
    (v) => v.drug === requestedDrug && new Date(v.date).getTime() >= cutoff,
  );
  const distinctHospitals = new Set(matchingVisits.map((v) => v.hospital)).size;

  const reasons: string[] = [];
  if (distinctHospitals >= 2) {
    reasons.push(
      `최근 ${windowDays}일 내 ${distinctHospitals}개 병원에서 동일 약물 처방 이력 (+ 이번 요청)`,
    );
  }
  if (matchingVisits.length >= 3) {
    reasons.push(`최근 ${windowDays}일 내 동일 약물 ${matchingVisits.length}회 반복 요청`);
  }

  return { flagged: reasons.length > 0, reasons, matchingVisits, distinctHospitals };
}

// ---- 해시체인 (간이 위변조 방지 로그, D2) ----
//
// PHI 평문을 절대 체인에 넣지 않는다 — VC의 issuer+jti로부터 만든 digest만 저장한다
// (eng-review Architecture P1).

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}
function toHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

/** VC의 issuer+jti만으로 digest 생성 — 평문 PHI를 체인에 절대 넣지 않기 위함. */
export function credentialDigest(issuerDid: string, jti: string): string {
  return toHex(sha256(utf8(`${issuerDid}:${jti}`)));
}

export interface ChainEntry {
  seq: number;
  timestamp: number;
  prevHash: string; // "" for genesis entry
  credentialDigest: string;
  entryHash: string;
}

function computeEntryHash(
  seq: number,
  timestamp: number,
  prevHash: string,
  digest: string,
): string {
  return toHex(sha256(utf8(`${seq}|${timestamp}|${prevHash}|${digest}`)));
}

export function appendChainEntry(
  chain: readonly ChainEntry[],
  digest: string,
  timestamp: number = Date.now(),
): ChainEntry[] {
  const seq = chain.length;
  const prevHash = seq > 0 ? chain[seq - 1].entryHash : "";
  const entryHash = computeEntryHash(seq, timestamp, prevHash, digest);
  return [...chain, { seq, timestamp, prevHash, credentialDigest: digest, entryHash }];
}

export interface ChainVerifyResult {
  ok: boolean;
  brokenAtSeq: number | null;
}

/** 체인 전체를 처음부터 재계산해 각 entryHash가 그대로인지 확인 — 위변조 탐지. */
export function verifyChain(chain: readonly ChainEntry[]): ChainVerifyResult {
  let prevHash = "";
  for (const entry of chain) {
    const expected = computeEntryHash(
      entry.seq,
      entry.timestamp,
      prevHash,
      entry.credentialDigest,
    );
    if (expected !== entry.entryHash) {
      return { ok: false, brokenAtSeq: entry.seq };
    }
    prevHash = entry.entryHash;
  }
  return { ok: true, brokenAtSeq: null };
}
