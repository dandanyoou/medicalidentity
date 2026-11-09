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
  major: { id: string; name: string; gu: string; lat?: number; lng?: number }[];
}

export interface LatLng {
  lat: number;
  lng: number;
}

/** 두 지점 사이 거리(km) — 하버사인. 서울 안에서는 수십 m 오차면 충분하다. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round((km * 1000) / 10) * 10}m`;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
}

export type SortMode = "recommended" | "distance" | "name";

/** 종별 순위 — 낮을수록 큰 병원. 데이터 빌드 스크립트와 같은 기준. */
const TYPE_RANK: Record<string, number> = {
  상급종합: 0,
  종합병원: 1,
  병원: 2,
  요양병원: 3,
  정신병원: 3,
  치과병원: 3,
  한방병원: 3,
  의원: 4,
};
const typeRank = (t: string) => TYPE_RANK[t] ?? 5;
/** 추천순에서 거리 가중 — 이만큼 멀어질 때마다 한 급 낮은 곳과 같아진다. */
const KM_PER_RANK = 3;

/**
 * 정렬. 추천순은 종별이 높은 곳을 앞에 두되, 위치를 알면 가까운 낮은 급도 올라온다
 * (의원 300m가 종합병원 9km보다 앞설 수 있다). 가까운 순인데 위치를 모르면 추천순.
 * 이용자 평가순은 평가 데이터가 쌓인 뒤에만 만든다(과장 금지).
 */
export function sortHospitals(list: Hospital[], mode: SortMode, ctx: { here?: LatLng | null }): Hospital[] {
  const here = ctx.here ?? null;
  if (mode === "name") return [...list].sort((a, b) => displayName(a).localeCompare(displayName(b), "ko"));
  if (mode === "distance" && here) return sortByDistance(list, here);
  const score = (h: Hospital) => {
    const base = typeRank(h.type);
    if (!here || h.lat === undefined || h.lng === undefined) return base;
    return base + distanceKm(here, { lat: h.lat, lng: h.lng }) / KM_PER_RANK;
  };
  return [...list].sort(
    (a, b) => score(a) - score(b) || b.doctors - a.doctors || displayName(a).localeCompare(displayName(b), "ko"),
  );
}

/** 가까운 순 — 좌표가 없는 곳은 맨 뒤(원본 순서 유지). 원본 배열은 바꾸지 않는다. */
export function sortByDistance<T extends { lat?: number; lng?: number }>(list: T[], here: LatLng): T[] {
  const withD = list.map((h, i) => ({
    h,
    i,
    d: h.lat !== undefined && h.lng !== undefined ? distanceKm(here, { lat: h.lat, lng: h.lng }) : Infinity,
  }));
  withD.sort((a, b) => a.d - b.d || a.i - b.i);
  return withD.map((x) => x.h);
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
