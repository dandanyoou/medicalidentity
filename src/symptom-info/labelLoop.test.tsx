// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SymptomInfoScreen } from "./SymptomInfoScreen";
import { listRecords, clearRecords } from "../labeling/store";

function typeSymptom(text: string) {
  const input = screen.getByPlaceholderText(/머리가 아프고 속이 메스꺼워요/);
  fireEvent.change(input, { target: { value: text } });
}

beforeEach(() => clearRecords());
afterEach(() => {
  cleanup();
  clearRecords();
});

describe("SymptomInfoScreen — 라벨 확인·교정 루프", () => {
  it("매칭이 있으면 '이 분류가 맞나요?' 교정 섹션이 뜬다", () => {
    render(
      <MemoryRouter>
        <SymptomInfoScreen />
      </MemoryRouter>,
    );
    typeSymptom("머리가 아파요");
    expect(screen.getByText("이 분류가 맞나요?")).toBeTruthy();
    expect(screen.getByLabelText("두통 맞아요")).toBeTruthy();
  });

  it("라벨을 confirm하고 기여하면 검증된 레코드가 저장된다", () => {
    render(
      <MemoryRouter>
        <SymptomInfoScreen />
      </MemoryRouter>,
    );
    typeSymptom("머리가 아파요");
    fireEvent.click(screen.getByLabelText("두통 맞아요"));
    fireEvent.click(screen.getByRole("button", { name: "이 라벨 데이터셋에 기여" }));

    expect(screen.getByText(/데이터셋에 기여됐어요/)).toBeTruthy();
    const recs = listRecords();
    expect(recs).toHaveLength(1);
    expect(recs[0].confirmedTags).toContain("두통");
    expect(recs[0].rawText).toBe("머리가 아파요");
  });

  it("최상단 법적 고지 alert은 여전히 하나뿐이다(계약 유지)", () => {
    render(
      <MemoryRouter>
        <SymptomInfoScreen />
      </MemoryRouter>,
    );
    typeSymptom("머리가 아파요");
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });
});
