/**
 * 서울 병원 목록 — 심평원 "전국 병의원 및 약국 현황" 공공데이터.
 *
 * 색인(구 목록·상급종합병원)은 번들에 들어 있고, 구별 병원 목록(수백 KB)은
 * 구를 고른 순간 /data/hospitals/seoul/<구>.json 으로 받는다. 서비스워커는
 * 이 json을 미리 받지 않는다(vite.config의 globPatterns에 json 없음).
 *
 * 데이터 생성: scripts/build-hospitals.mjs. 출처·기준일은 색인에 있다.
 */
import index from "./hospitals.seoul-index.json";

export interface Hospital {
  id: string;
  /** 공식 요양기관명 — 저장·전달에는 이걸 쓴다. */
  name: string;
  /** 법인명을 뗀 화면용 이름. */
  shortName?: string;
  type: string; // 상급종합 · 종합병원 · 병원 · 의원 · 치과의원 · 한의원 …
  gu: string;
  dong?: string;
  addr: string;
  tel?: string;
  doctors: number;
  lat?: number;
  lng?: number;
  depts: string[];
}

export interface SeoulIndex {
  source: string;
  sourceUrl: string;
  license: string;
  asOf: string;
  total: number;
  gus: { gu: string; count: number }[];
  major: { id: string; name: string; gu: string }[];
}

export const SEOUL_INDEX: SeoulIndex = index as SeoulIndex;

/** 앱 진료과 → 심평원 진료과목. 세부 분과(소화기내과)는 상위 과(내과)로 본다. */
const DEPT_ALIASES: Record<string, string[]> = {
  소화기내과: ["내과"],
  응급실: ["응급의학과"],
};

export function matchesDept(h: Hospital, dept: string | null | undefined): boolean {
  if (!dept) return true;
  const wanted = [dept, ...(DEPT_ALIASES[dept] ?? [])];
  return h.depts.some((d) => wanted.includes(d));
}

export function displayName(h: Hospital): string {
  return h.shortName ?? h.name;
}

const squash = (s: string) => s.replace(/\s+/g, "").toLowerCase();

export function filterHospitals(
  list: Hospital[],
  opts: { dept: string | null | undefined; query: string },
): Hospital[] {
  const q = squash(opts.query);
  return list.filter((h) => {
    if (!matchesDept(h, opts.dept)) return false;
    if (!q) return true;
    return [h.name, h.shortName ?? "", h.dong ?? ""].some((s) => squash(s).includes(q));
  });
}

const cache = new Map<string, Promise<Hospital[]>>();

export function guFileUrl(gu: string): string {
  return `/data/hospitals/seoul/${encodeURIComponent(gu)}.json`;
}

/** 구별 병원 목록. 같은 구는 한 번만 받는다. 실패하면 캐시를 비우고 오류를 던진다. */
export function loadGuHospitals(gu: string): Promise<Hospital[]> {
  const hit = cache.get(gu);
  if (hit) return hit;
  const p = (async () => {
    const res = await fetch(guFileUrl(gu));
    if (!res.ok) throw new Error(`${gu} 병원 목록을 받지 못했어요 (${res.status})`);
    const data: unknown = await res.json();
    if (!Array.isArray(data)) throw new Error(`${gu} 병원 목록 형식이 올바르지 않아요`);
    return data as Hospital[];
  })();
  cache.set(gu, p);
  p.catch(() => cache.delete(gu));
  return p;
}

/** 테스트용. */
export function clearHospitalCache(): void {
  cache.clear();
}
