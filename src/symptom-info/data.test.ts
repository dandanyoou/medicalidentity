import { describe, expect, it } from "vitest";
import { SYMPTOMS, searchSymptoms } from "./data";

describe("증상 데이터 무결성", () => {
  it("80개 이상의 증상 카테고리를 제공한다(2026-10-26 확장: 안과·피부과·정신건강·정형외과·비뇨기과 등 보강)", () => {
    expect(SYMPTOMS.length).toBeGreaterThanOrEqual(80);
  });

  it("label + alias를 합쳐 200개 이상의 인식 가능한 표현을 제공한다", () => {
    const total = SYMPTOMS.reduce((sum, s) => sum + 1 + s.aliases.length, 0);
    expect(total).toBeGreaterThanOrEqual(200);
  });

  it("모든 항목에 일반 정보·응급 신호·지도 검색어가 비어있지 않다", () => {
    for (const s of SYMPTOMS) {
      expect(s.generalInfo.length).toBeGreaterThan(0);
      expect(s.redFlags.length).toBeGreaterThan(0);
      expect(s.mapQuery.length).toBeGreaterThan(0);
    }
  });

  it("key가 전부 고유하다", () => {
    const keys = SYMPTOMS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("alias로 검색하면 올바른 항목을 찾는다", () => {
    const results = searchSymptoms("머리아픔");
    expect(results.some((s) => s.key === "headache")).toBe(true);
  });

  it("빈 검색어는 아무것도 반환하지 않는다(전체 노출 방지)", () => {
    expect(searchSymptoms("")).toHaveLength(0);
    expect(searchSymptoms("   ")).toHaveLength(0);
  });

  it("한 문장에 여러 부위가 섞여도(조사·어미가 달라도) 전부 찾아낸다", () => {
    // 2026-10-26: "허리가 아픈데"(ㄴ데 활용) + "머리도 좀 아프고"(도 조사 +
    // 고 활용) — 둘 다 이전까지는 painPhrases 이전 고정 문자열로 못 잡던 패턴.
    const results = searchSymptoms("허리가 아픈데 지금 머리도 좀 아프고");
    const keys = results.map((s) => s.key);
    expect(keys).toContain("back-pain");
    expect(keys).toContain("headache");
  });

  it("받침 있는 부위 단어(목/무릎/발목/손목/눈)도 '이' 조사로 매칭된다", () => {
    expect(searchSymptoms("목이 아파요").some((s) => s.key === "neck-pain")).toBe(true);
    expect(searchSymptoms("무릎이 아파요").some((s) => s.key === "knee-pain")).toBe(true);
    expect(searchSymptoms("발목이 아파요").some((s) => s.key === "ankle-pain")).toBe(true);
    expect(searchSymptoms("손목이 아파요").some((s) => s.key === "wrist-pain")).toBe(true);
    expect(searchSymptoms("눈이 아파요").some((s) => s.key === "eye-pain")).toBe(true);
  });

  it("조사·띄어쓰기 없이 붙여 쓴 표현도 매칭된다(사용자 테스트 사례: '머리아프고 지금 다리도 아파')", () => {
    const keys = searchSymptoms("머리아프고 지금 다리도 아파").map((s) => s.key);
    expect(keys).toContain("headache");
    expect(keys).toContain("leg-pain");
  });

  it("다리통증 항목이 존재하고 정형외과로 안내한다", () => {
    const leg = SYMPTOMS.find((s) => s.key === "leg-pain");
    expect(leg).toBeTruthy();
    expect(leg?.mapQuery).toBe("정형외과");
  });

  it("띄어쓰기는 있지만 조사가 빠진 표현도 매칭된다(사용자 테스트 사례: '머리 아프고 구토하고 속이 매스꺼움')", () => {
    // "머리아프고"(붙여쓰기)·"머리가 아프고"(조사)와는 다른 세 번째 패턴 —
    // 띄어쓰기는 있는데 조사("가/도/는")가 통째로 빠진 경우.
    const keys = searchSymptoms("머리 아프고 구토하고 속이 매스꺼움").map((s) => s.key);
    expect(keys).toContain("headache");
    expect(keys).toContain("vomiting");
    expect(keys).toContain("nausea");
  });

  it("'안 좋다' 부정 표현도 붙여 쓴 버전까지 매칭된다(사용자 테스트 사례: '머리아파 다리아파 눈이 아파 속이 안좋아')", () => {
    const keys = searchSymptoms("머리아파 다리아파 눈이 아파 속이 안좋아").map((s) => s.key);
    expect(keys).toContain("headache");
    expect(keys).toContain("leg-pain");
    expect(keys).toContain("eye-pain");
    expect(keys).toContain("nausea");
  });

  it("'아프다' 계열이 아닌 통증 표현(욱신욱신 거림, 무거워짐)도 잡는다(사용자 테스트 사례)", () => {
    const keys = searchSymptoms(
      "머리가 아프고 다리도 욱신욱신 거리는데 다리가 좀 어제부터 무거워지는데 어제 새벽쯤에 구토도 했어",
    ).map((s) => s.key);
    expect(keys).toContain("headache");
    expect(keys).toContain("vomiting");
    expect(keys).toContain("leg-pain");
  });

  it("'무거워요' 단독 표현도 매칭된다(욱신욱신과 별개 경로)", () => {
    expect(searchSymptoms("다리가 무거워요").map((s) => s.key)).toContain("leg-pain");
  });
});
