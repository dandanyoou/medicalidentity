import { describe, it, expect } from "vitest";
import { checkRedFlags, recommendDepts } from "./triage";
import type { IntakeAnswers } from "./engine";

function a(over: Partial<IntakeAnswers>): IntakeAnswers {
  return { quality: {}, triggers: [], associated: [], ...over };
}

describe("checkRedFlags — 같이 나오면 위험한 조합", () => {
  it("가슴 + 숨이 참 → 119", () => {
    const r = checkRedFlags(a({ parts: ["가슴"], associated: ["숨이 참"] }));
    expect(r?.level).toBe("119");
  });

  it("가슴 + 팔·손 또는 목·어깨 통증 → 119", () => {
    expect(checkRedFlags(a({ parts: ["가슴", "팔·손"] }))?.level).toBe("119");
    expect(checkRedFlags(a({ parts: ["가슴", "목·어깨"] }))?.level).toBe("119");
  });

  it("머리 + 저림·감각 이상 → 119", () => {
    expect(checkRedFlags(a({ parts: ["머리"], associated: ["저림·감각 이상"] }))?.level).toBe("119");
  });

  it("머리 + 열 + 목·어깨 → 응급실", () => {
    expect(checkRedFlags(a({ parts: ["머리", "목·어깨"], associated: ["열"] }))?.level).toBe("응급실");
  });

  it("배 + 아주 심함 + 열 → 응급실", () => {
    expect(checkRedFlags(a({ parts: ["배"], severity: 9, associated: ["열"] }))?.level).toBe("응급실");
  });

  it("오늘 시작한 아주 심한 통증 → 오늘 진료", () => {
    expect(checkRedFlags(a({ parts: ["허리·등"], severity: 9, onset: "오늘" }))?.level).toBe("오늘 진료");
  });

  it("여러 개가 겹치면 가장 급한 것을 돌려준다", () => {
    const r = checkRedFlags(a({ parts: ["가슴"], associated: ["숨이 참"], severity: 9, onset: "오늘" }));
    expect(r?.level).toBe("119");
  });

  it("흔한 조합(머리 + 어깨 + 다리, 보통 강도)은 경고하지 않는다", () => {
    expect(checkRedFlags(a({ parts: ["머리", "목·어깨", "다리·발"], severity: 5, onset: "1-3일" }))).toBeNull();
  });

  it("경고 문구에 병명을 쓰지 않는다", () => {
    const r = checkRedFlags(a({ parts: ["가슴"], associated: ["숨이 참"] }))!;
    expect(r.message).not.toMatch(/심근경색|협심증|뇌졸중|뇌수막염|맹장/);
  });
});

describe("recommendDepts — 고른 부위 기준 진료과", () => {
  it("한 곳이면 그 부위의 과(두통은 가정의학과 먼저, 신경과 다음)", () => {
    expect(recommendDepts(a({ parts: ["머리"] }))?.depts).toEqual(["가정의학과", "신경과"]);
    expect(recommendDepts(a({ parts: ["눈"] }))?.depts).toEqual(["안과"]);
    expect(recommendDepts(a({ parts: ["피부"] }))?.depts).toEqual(["피부과"]);
  });

  it("모두 뼈·근육 쪽이면 정형외과, 저림이 있으면 신경과도", () => {
    const r = recommendDepts(a({ parts: ["목·어깨", "허리·등", "다리·발"], primary: "허리·등" }))!;
    expect(r.depts).toEqual(["정형외과"]);
    expect(r.reason).toContain("뼈·근육");
    expect(
      recommendDepts(a({ parts: ["목·어깨", "팔·손"], primary: "팔·손", associated: ["저림·감각 이상"] }))?.depts,
    ).toEqual(["정형외과", "신경과"]);
  });

  it("서로 다른 쪽이 섞이면 가정의학과 1순위, 가장 불편한 곳의 과 2순위", () => {
    const r = recommendDepts(a({ parts: ["머리", "목·어깨", "다리·발"], primary: "머리" }))!;
    expect(r.depts).toEqual(["가정의학과", "신경과"]);
    expect(r.reason).toBe(
      "여러 곳이 함께 아파서, 먼저 전체를 보는 가정의학과를 추천해요. 가장 불편한 머리는 신경과에서도 볼 수 있어요.",
    );
  });

  it("온몸 + 열이면 내과·가정의학과", () => {
    expect(recommendDepts(a({ parts: ["온몸"], associated: ["열"] }))?.depts).toEqual(["내과", "가정의학과"]);
  });

  it("부위를 안 골랐으면 추천하지 않는다", () => {
    expect(recommendDepts(a({}))).toBeNull();
  });
});
