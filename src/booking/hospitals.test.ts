// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SEOUL_INDEX,
  clearHospitalCache,
  displayName,
  filterHospitals,
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
