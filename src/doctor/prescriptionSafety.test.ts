import { describe, expect, it } from "vitest";
import { checkPrescription, normalizeAllergen, matchLookupDrug } from "./prescriptionSafety";

describe("normalizeAllergen — 환자가 적은 알레르기를 DUR 분류 키로", () => {
  it("한글·영문·대소문자를 같은 키로 본다", () => {
    expect(normalizeAllergen("페니실린")).toBe("penicillin");
    expect(normalizeAllergen("Penicillin")).toBe("penicillin");
    expect(normalizeAllergen("설파제")).toBe("sulfa");
    expect(normalizeAllergen("소염진통제(NSAID)")).toBe("nsaid");
    expect(normalizeAllergen("조영제")).toBe("iodine_contrast");
  });

  it("모르는 알레르기는 null", () => {
    expect(normalizeAllergen("땅콩")).toBeNull();
  });
});

describe("matchLookupDrug — 의사가 적은 약 이름에서 DUR 약물 찾기", () => {
  it("용량이 붙어 있어도, 한글로 적어도 찾는다", () => {
    expect(matchLookupDrug("Amoxicillin 500mg")).toEqual({ drug: "Amoxicillin", key: "penicillin" });
    expect(matchLookupDrug("아목시실린 500mg 캡슐")).toEqual({ drug: "Amoxicillin", key: "penicillin" });
    expect(matchLookupDrug("이부프로펜 400mg")).toEqual({ drug: "Ibuprofen", key: "nsaid" });
  });

  it("룩업에 없는 약은 null(경고도 안전 확인도 못 한다)", () => {
    expect(matchLookupDrug("아세트아미노펜 500mg")).toBeNull();
  });
});

describe("checkPrescription — 알레르기 충돌·중복", () => {
  it("환자 알레르기 계열의 약이면 알레르기 경고", () => {
    const w = checkPrescription("아목시실린 500mg", { allergens: ["페니실린"], currentMeds: [], prescribed: [] });
    expect(w).toEqual([{ type: "allergy", key: "penicillin", label: "페니실린계" }]);
  });

  it("복용 중인 약이나 이미 넣은 처방과 같은 약(또는 같은 계열)이면 중복 경고", () => {
    const w = checkPrescription("Ibuprofen 400mg", {
      allergens: [],
      currentMeds: ["나프록센 250mg"],
      prescribed: [{ drug: "이부프로펜 200mg" }],
    });
    expect(w).toEqual([
      { type: "duplicate", with: "이부프로펜 200mg", reason: "같은 약" },
      { type: "duplicate", with: "나프록센 250mg", reason: "같은 계열(nsaid)" },
    ]);
  });

  it("룩업에 없고 겹치지도 않으면 경고 없음(확인 불가는 따로 표시)", () => {
    expect(checkPrescription("아세트아미노펜 500mg", { allergens: ["페니실린"], currentMeds: [], prescribed: [] })).toEqual([]);
  });
});
