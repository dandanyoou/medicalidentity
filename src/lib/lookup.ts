// 정적 룩업 매칭 공통 헬퍼. DDICheck(알레르기-약물 충돌)와
// controlled-substance(관리약물 중복처방)이 둘 다 "선택된 값이 룩업 맵의
// 어떤 키 아래 있는지" 판정하는 동일한 계약을 쓴다.

export type LookupMap = Record<string, string[]>;

/** value가 lookup의 어느 key 아래에든 존재하면 true. */
export function existsInLookup(value: string, lookup: LookupMap): boolean {
  return Object.values(lookup).some((entries) => entries.includes(value));
}

/** keys 순서대로 확인해, value가 포함된 첫 key를 반환. 없으면 null. */
export function firstMatchingKey(
  value: string,
  keys: string[],
  lookup: LookupMap,
): string | null {
  for (const key of keys) {
    const entries = lookup[key];
    if (entries && entries.includes(value)) return key;
  }
  return null;
}
