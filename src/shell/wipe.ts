/**
 * 이 앱이 기기에 남긴 데이터를 모두 지운다 — 동의 철회 때 쓴다.
 * medid.* (가족·진료·동의·설정·라벨 등)와 checker_* (체커 집계용 식별자)만 지우고,
 * 같은 출처의 다른 데이터는 건드리지 않는다. 지운 키 개수를 돌려준다.
 */
const PREFIXES = ["medid.", "checker_"];

function wipeStorage(storage: Storage): number {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k && PREFIXES.some((p) => k.startsWith(p))) keys.push(k);
  }
  keys.forEach((k) => storage.removeItem(k));
  return keys.length;
}

export function wipeLocalData(): number {
  let n = 0;
  try {
    n += wipeStorage(localStorage);
  } catch {
    /* 접근 불가 — 지울 것도 없다 */
  }
  try {
    n += wipeStorage(sessionStorage);
  } catch {
    /* no-op */
  }
  return n;
}
