/**
 * 가족 추가 인증 — 아무나 "내 가족"으로 등록하지 못하게, 다음 순서를 거친다.
 *
 *   1. 증명서 확인   온라인 가족관계증명서(문서확인번호) 또는 종이 등본 사진
 *   2. 가족 정보     증명서에 기재된 성함·관계 + 연락처
 *   3. 회원 확인     그 연락처로 우리 서비스를 쓰는 회원이면 이름까지 맞는지 대조
 *   4. 가족 추가     확인된 정보로 추가(회원이면 상대 수락 대기)
 *
 * 정직: 문서 진위확인(정부24·대법원 전자가족관계등록 조회)과 문자 인증·푸시는
 * 기관 연동 전이라 '시연'이다. 지금은 번호 형식·기재 여부 확인·회원 대조까지만
 * 하고, 주민등록번호와 증명서 원본·사진은 저장하지 않는다.
 */

export type ProofMethod = "family-cert" | "resident-register";

export const PROOF_LABEL: Record<ProofMethod, string> = {
  "family-cert": "온라인 가족관계증명서",
  "resident-register": "종이 주민등록등본",
};

function digits(s: string): string {
  return s.replace(/\D/g, "");
}

/** 정부24 전자문서 문서확인번호 — 숫자 16자리(4-4-4-4). */
export function isValidDocNumber(s: string): boolean {
  return /^[\d-\s]+$/.test(s) && digits(s).length === 16;
}

/** 저장용 — 앞뒤 4자리만 남긴다. */
export function maskDocNumber(s: string): string {
  const d = digits(s);
  return `${d.slice(0, 4)}-****-****-${d.slice(12, 16)}`;
}

export function normalizePhone(s: string): string {
  return digits(s);
}

export function isValidMobile(s: string): boolean {
  return /^01[016789]\d{7,8}$/.test(normalizePhone(s));
}

export function formatPhone(s: string): string {
  const d = normalizePhone(s);
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return d;
}

export function maskPhone(s: string): string {
  const d = normalizePhone(s);
  return `${d.slice(0, 3)}-****-${d.slice(-4)}`;
}

export interface ServiceUser {
  userId: string;
  name: string;
  phone: string; // 숫자만
}

/**
 * 서비스 회원 명부 — 시연용. 실제로는 서버에서 연락처로 조회하고, 응답에는
 * 이름 일치 여부만 돌려준다(다른 회원의 개인정보를 그대로 내려주지 않는다).
 */
export const SERVICE_DIRECTORY: readonly ServiceUser[] = [
  { userId: "u-1001", name: "김복순", phone: "01012345678" },
  { userId: "u-1002", name: "김철수", phone: "01098765432" },
  { userId: "u-1003", name: "이영자", phone: "01055554444" },
];

export type LookupResult =
  | { status: "member"; user: ServiceUser }
  | { status: "name-mismatch" }
  | { status: "not-member" };

/** 연락처로 회원을 찾고, 증명서상 성함과 같은지까지 본다. */
export function lookupServiceUser(name: string, phone: string): LookupResult {
  const p = normalizePhone(phone);
  const user = SERVICE_DIRECTORY.find((u) => u.phone === p);
  if (!user) return { status: "not-member" };
  if (user.name !== name.trim()) return { status: "name-mismatch" };
  return { status: "member", user };
}

export function isDuplicatePhone(phone: string, members: { phone?: string }[]): boolean {
  const p = normalizePhone(phone);
  return members.some((m) => m.phone !== undefined && normalizePhone(m.phone) === p);
}
