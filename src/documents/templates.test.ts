// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { addTemplatePlaceholder, listTemplates, TEMPLATES_KEY } from "./templates";

beforeEach(() => localStorage.clear());

describe("서류 양식 — 기본 4종 + 병원 양식 PDF 자리(시연)", () => {
  it("기본 양식 4종이 서류 종류마다 하나씩 있다", () => {
    const t = listTemplates();
    expect(t.filter((x) => x.source === "default").map((x) => x.kind)).toEqual(["진단서", "소견서", "처방전 사본", "진료비 영수증"]);
  });

  it("병원 양식 PDF를 올리면 파일 이름·크기만 자리로 남고(내용은 저장하지 않음), 그 종류의 양식 목록에 붙는다", () => {
    const p = addTemplatePlaceholder({ kind: "진단서", fileName: "행복의원-진단서.pdf", size: 120_000 });
    expect(p.source).toBe("hospital");
    expect(p.fileName).toBe("행복의원-진단서.pdf");
    expect(TEMPLATES_KEY.startsWith("medid.")).toBe(true);
    expect(localStorage.getItem(TEMPLATES_KEY)).not.toMatch(/%PDF/);
    const forKind = listTemplates().filter((x) => x.kind === "진단서");
    expect(forKind).toHaveLength(2);
  });

  it("PDF가 아니면 받지 않는다", () => {
    expect(() => addTemplatePlaceholder({ kind: "소견서", fileName: "양식.docx", size: 10 })).toThrow(/PDF/);
  });
});
