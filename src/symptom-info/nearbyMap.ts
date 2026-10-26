// 네이버 지도로 그대로 넘긴다 — SymptomInfoScreen과 SymptomDiaryScreen
// 양쪽에서 쓰는 공용 로직이라 분리했다(중복 금지). 특정 병원을 골라서
// 순서를 매기지 않는다 — 검색어만 넘기고 나머지는 네이버 지도 자체
// 결과·정렬에 맡긴다.
export function openNearbyMap(query: string) {
  const url = `https://map.naver.com/p/search/${encodeURIComponent(query)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
