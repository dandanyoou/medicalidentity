/**
 * 가족 의료지갑 — 보호자(자녀)가 가족 구성원의 의료 프로필을 한 계정에서 관리.
 *
 * 포지셔닝의 핵심: 사용자는 환자(고령 부모)가 아니라 보호자다. 노인이 앱을
 * 직접 쓰지 않아도 되게, 자녀가 부모의 응급 의료신원·복용약·환급을 대신 챙긴다.
 *
 * 본인(SELF)은 실제 DID/SD-JWT VC를 가진 구성원(지갑의 기존 데모 신원).
 * 추가 가족은 데모 프로필(실제 발급 서명 없음) — UI에서 '시연'으로 표시한다.
 */

const KEY = "medid.family.v1";
export const SELF_ID = "self";

export type Relation = "본인" | "부모" | "배우자" | "자녀" | "형제" | "기타";

export interface FamilyMember {
  id: string;
  name: string;
  relation: Relation;
  blood: string; // A · B · O · AB
  rh: "+" | "-";
  allergen?: string;
  severity?: string;
  meds?: string[]; // 복용 중인 약 — 응급 시 중요
  isSelf?: boolean; // 실제 VC 보유자(본인)
}

// 지갑의 기존 데모 신원과 일치하는 본인 프로필(실제 VC 보유자).
const SELF: FamilyMember = {
  id: SELF_ID,
  name: "김단유",
  relation: "본인",
  blood: "A",
  rh: "+",
  allergen: "페니실린",
  severity: "중증",
  meds: [],
  isSelf: true,
};

type StoredMember = Omit<FamilyMember, "isSelf">;

function read(): FamilyMember[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [SELF];
    const parsed = JSON.parse(raw) as StoredMember[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [SELF];
    // 본인은 항상 목록 맨 앞에 유지한다.
    const others = parsed.filter((m) => m.id !== SELF_ID);
    return [SELF, ...others.map((m) => ({ ...m }))];
  } catch {
    return [SELF];
  }
}

function write(members: FamilyMember[]): void {
  // 본인은 상수로 다시 시드하므로 저장하지 않는다(추가 가족만 저장).
  const others = members.filter((m) => m.id !== SELF_ID);
  try {
    localStorage.setItem(KEY, JSON.stringify(others));
  } catch {
    /* 저장 실패는 조용히 무시 — 가족 추가는 부가 기능 */
  }
}

export function listMembers(): FamilyMember[] {
  return read();
}

export function getMember(id: string): FamilyMember | undefined {
  return read().find((m) => m.id === id);
}

export function addMember(
  input: Omit<FamilyMember, "id" | "isSelf">,
): FamilyMember {
  const member: FamilyMember = {
    ...input,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `fam_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  };
  write([...read(), member]);
  return member;
}

export function removeMember(id: string): void {
  if (id === SELF_ID) return; // 본인은 삭제 불가
  write(read().filter((m) => m.id !== id));
}

/** 테스트·초기화용 — 추가 가족을 전부 지우고 본인만 남긴다. */
export function resetFamily(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}
