// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SymptomDiaryScreen } from "./SymptomDiaryScreen";
import { addDiaryEntry } from "./diary";

describe("SymptomDiaryScreen — 환자가 쓴 글을 그대로 보여준다", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("기록이 없으면 '아직 기록된 증상이 없어요'를 보여준다", () => {
    render(
      <MemoryRouter>
        <SymptomDiaryScreen />
      </MemoryRouter>,
    );
    expect(screen.getByText("아직 기록된 증상이 없어요.")).toBeTruthy();
  });

  it("저장된 일기를 원문 그대로, 해석 없이 보여준다", () => {
    addDiaryEntry({
      rawText: "어제부터 왼쪽 머리만 콕콕 쑤시고 빛보면 더 아파요",
      matchedTags: ["두통"],
      onset: "어제부터",
      severity: 4,
      note: "진통제 먹어도 안 나아짐",
    });

    render(
      <MemoryRouter>
        <SymptomDiaryScreen />
      </MemoryRouter>,
    );
    expect(screen.getByText("어제부터 왼쪽 머리만 콕콕 쑤시고 빛보면 더 아파요")).toBeTruthy();
    expect(screen.getByText("두통")).toBeTruthy();
    expect(screen.getByText("4 / 5")).toBeTruthy();
    expect(screen.getByText("진통제 먹어도 안 나아짐")).toBeTruthy();
  });

  it("삭제 버튼을 누르면 그 기록만 사라진다", () => {
    addDiaryEntry({ rawText: "기록 A", matchedTags: [] });
    addDiaryEntry({ rawText: "기록 B", matchedTags: [] });

    render(
      <MemoryRouter>
        <SymptomDiaryScreen />
      </MemoryRouter>,
    );
    const deleteButtons = screen.getAllByLabelText("이 기록 삭제");
    fireEvent.click(deleteButtons[0]); // 최신순이라 "기록 B"가 먼저

    expect(screen.queryByText("기록 B")).toBeNull();
    expect(screen.getByText("기록 A")).toBeTruthy();
  });
});
