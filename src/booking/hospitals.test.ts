// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SEOUL_INDEX,
  clearHospitalCache,
  displayName,
  distanceKm,
  filterHospitals,
  formatDistance,
  sortByDistance,
  sortHospitals,
  loadGuHospitals,
  matchesDept,
  type Hospital,
} from "./hospitals";

function h(over: Partial<Hospital>): Hospital {
  return {
    id: "x",
    name: "테스트의원",
    type: "의원",
    gu: "종로구",
    addr: "서울특별시 종로구",
    doctors: 1,
    depts: ["내과"],
    ...over,
  };
}

describe("서울 병원 색인(번들 포함)", () => {
  it("25개 구와 상급종합병원 목록이 있고, 출처·기준일이 적혀 있다", () => {
    expect(SEOUL_INDEX.gus).toHaveLength(25);
    expect(SEOUL_INDEX.gus.map((g) => g.gu)).toContain("강남구");
    expect(SEOUL_INDEX.major.map((m) => m.name)).toContain("서울대학교병원");
    expect(SEOUL_INDEX.source).toContain("건강보험심사평가원");
    expect(SEOUL_INDEX.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("matchesDept — 앱 진료과와 심평원 진료과목 맞추기", () => {
  it("같은 이름이면 그대로", () => {
    expect(matchesDept(h({ depts: ["내과", "안과"] }), "안과")).toBe(true);
    expect(matchesDept(h({ depts: ["내과"] }), "안과")).toBe(false);
  });

  it("소화기내과는 심평원에 없는 세부 과라 '내과'가 있으면 맞는 것으로 본다", () => {
    expect(matchesDept(h({ depts: ["내과"] }), "소화기내과")).toBe(true);
  });

  it("진료과 지정이 없으면 모두 맞는다", () => {
    expect(matchesDept(h({ depts: [] }), null)).toBe(true);
  });
});

describe("filterHospitals — 진료과·검색어", () => {
  const list = [
    h({ id: "a", name: "서울튼튼정형외과의원", depts: ["정형외과"] }),
    h({ id: "b", name: "재단법인푸른재단 푸른내과", shortName: "푸른내과", depts: ["내과"] }),
    h({ id: "c", name: "하늘안과의원", depts: ["안과"], dong: "혜화동" }),
  ];

  it("진료과로 거르고, 검색어는 이름·짧은 이름·동에서 띄어쓰기 없이 찾는다", () => {
    expect(filterHospitals(list, { dept: "내과", query: "" }).map((x) => x.id)).toEqual(["b"]);
    expect(filterHospitals(list, { dept: null, query: "푸른 내과" }).map((x) => x.id)).toEqual(["b"]);
    expect(filterHospitals(list, { dept: null, query: "혜화" }).map((x) => x.id)).toEqual(["c"]);
    expect(filterHospitals(list, { dept: "안과", query: "튼튼" })).toEqual([]);
  });
});

describe("거리 — 가까운 순", () => {
  // 서울대학교병원(37.5797, 126.9990) ↔ 서울시청(37.5665, 126.9780): 약 2.3km
  const here = { lat: 37.5665, lng: 126.978 };

  it("하버사인으로 km를 구하고, 1km 미만은 m로 보여준다", () => {
    const d = distanceKm(here, { lat: 37.5797151, lng: 126.9990168 });
    expect(d).toBeGreaterThan(2.1);
    expect(d).toBeLessThan(2.5);
    expect(formatDistance(2.34)).toBe("2.3km");
    expect(formatDistance(0.42)).toBe("420m");
    expect(formatDistance(12.6)).toBe("13km");
  });

  it("좌표가 없는 병원은 맨 뒤로 보내고, 나머지는 가까운 순", () => {
    const list = [
      h({ id: "far", lat: 37.65, lng: 127.08 }),
      h({ id: "none" }),
      h({ id: "near", lat: 37.567, lng: 126.979 }),
    ];
    expect(sortByDistance(list, here).map((x) => x.id)).toEqual(["near", "far", "none"]);
    // 원본은 그대로.
    expect(list.map((x) => x.id)).toEqual(["far", "none", "near"]);
  });
});

describe("sortHospitals — 이용자 평가순(R8)", () => {
  const list = [
    h({ id: "a", name: "가나종합병원", type: "종합병원", doctors: 80 }),
    h({ id: "b", name: "나나의원", type: "의원", doctors: 3 }),
    h({ id: "c", name: "다다의원", type: "의원", doctors: 1 }),
  ];
  const ratings = new Map([
    ["나나의원", { avg: 4.8, count: 12, eligible: true }],
    ["다다의원", { avg: 3.2, count: 15, eligible: true }],
    ["가나종합병원", { avg: 5, count: 2, eligible: false }], // 표본 부족 → 평가순에서 뒤로
  ]);

  it("노출 가능한(n≥최소치) 병원을 평균 높은 순으로 앞에, 나머지는 추천순으로 뒤에", () => {
    expect(sortHospitals(list, "rating", { ratings }).map((x) => x.id)).toEqual(["b", "c", "a"]);
  });

  it("평가 정보가 없으면 추천순과 같다", () => {
    expect(sortHospitals(list, "rating", {}).map((x) => x.id)).toEqual(sortHospitals(list, "recommended", {}).map((x) => x.id));
  });
});

describe("sortHospitals — 추천순 · 가까운 순 · 이름순", () => {
  const here = { lat: 37.5665, lng: 126.978 };
  const list = [
    h({ id: "clinic-near", name: "바로의원", type: "의원", doctors: 1, lat: 37.567, lng: 126.979 }), // ~100m
    h({ id: "general-far", name: "가나종합병원", type: "종합병원", doctors: 80, lat: 37.65, lng: 127.1 }), // ~14km
    h({ id: "tertiary", name: "다라대학교병원", type: "상급종합", doctors: 900, lat: 37.58, lng: 126.999 }), // ~2.3km
    h({ id: "clinic-b", name: "나나의원", type: "의원", doctors: 3, lat: 37.6, lng: 127.0 }), // ~4.2km
  ];

  it("추천순(위치 모름): 종별 높은 곳 → 같은 급은 의사 수 → 이름", () => {
    expect(sortHospitals(list, "recommended", {}).map((x) => x.id)).toEqual([
      "tertiary",
      "general-far",
      "clinic-b",
      "clinic-near",
    ]);
  });

  it("추천순(위치 앎): 가까우면 낮은 급도 앞으로 — 3km마다 한 급씩", () => {
    // 종합병원 14km(1+4.7=5.7) < 상급종합 2.3km(0+0.8) ... 바로의원 100m(4+0.03=4.03)
    expect(sortHospitals(list, "recommended", { here }).map((x) => x.id)).toEqual([
      "tertiary",
      "clinic-near",
      "clinic-b",
      "general-far",
    ]);
  });

  it("가까운 순은 거리, 이름순은 가나다", () => {
    expect(sortHospitals(list, "distance", { here }).map((x) => x.id)).toEqual([
      "clinic-near",
      "tertiary",
      "clinic-b",
      "general-far",
    ]);
    expect(sortHospitals(list, "name", {}).map((x) => x.name)).toEqual([
      "가나종합병원",
      "나나의원",
      "다라대학교병원",
      "바로의원",
    ]);
  });

  it("가까운 순인데 위치를 모르면 추천순으로 둔다", () => {
    expect(sortHospitals(list, "distance", {})).toEqual(sortHospitals(list, "recommended", {}));
  });
});

describe("displayName", () => {
  it("짧은 이름이 있으면 그걸, 없으면 원래 이름", () => {
    expect(displayName(h({ name: "A", shortName: "B" }))).toBe("B");
    expect(displayName(h({ name: "A" }))).toBe("A");
  });
});

describe("loadGuHospitals — 구별 파일을 필요할 때 받고 한 번만 받는다", () => {
  afterEach(() => {
    clearHospitalCache();
    vi.unstubAllGlobals();
  });

  it("/data/hospitals/seoul/<구>.json 을 받아 돌려주고, 두 번째는 받지 않는다", async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request) =>
        new Response(JSON.stringify([h({ id: "q", gu: "종로구" })])),
    );
    vi.stubGlobal("fetch", fetchMock);
    const first = await loadGuHospitals("종로구");
    const second = await loadGuHospitals("종로구");
    expect(first.map((x) => x.id)).toEqual(["q"]);
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe("/data/hospitals/seoul/%EC%A2%85%EB%A1%9C%EA%B5%AC.json");
  });

  it("받기에 실패하면 오류를 던진다(조용히 빈 목록으로 속이지 않는다)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    await expect(loadGuHospitals("강남구")).rejects.toThrow(/강남구/);
  });
});
