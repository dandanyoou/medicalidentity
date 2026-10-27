// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

describe("SymptomDiaryScreen — 주변 병원 찾기 (일기에서도 가능해야 함)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(window, "open").mockImplementation(() => null);
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("매칭된 태그가 있으면 진료과별 '주변 찾기' 버튼이 뜨고, 누르면 네이버 지도가 열린다", () => {
    addDiaryEntry({ rawText: "머리가 아파요", matchedTags: ["두통"] });

    render(
      <MemoryRouter>
        <SymptomDiaryScreen />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "주변 가정의학과 찾기" }));

    expect(window.open).toHaveBeenCalledTimes(1);
    const [url] = (window.open as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("map.naver.com");
    expect(decodeURIComponent(url)).toContain("가정의학과");
  });

  it("복합 증상이면 진료과별로 버튼이 따로 뜬다(중복 제거)", () => {
    addDiaryEntry({ rawText: "머리 아프고 어지러워요", matchedTags: ["두통", "어지러움"] });

    render(
      <MemoryRouter>
        <SymptomDiaryScreen />
      </MemoryRouter>,
    );
    // 두통·어지러움 둘 다 가정의학과라 버튼은 1개만 떠야 한다(중복 제거).
    expect(screen.getAllByRole("button", { name: "주변 가정의학과 찾기" })).toHaveLength(1);
  });

  it("매칭된 태그가 없으면 '주변 찾기' 버튼이 안 뜬다", () => {
    addDiaryEntry({ rawText: "아무도모르는희귀증상XYZ", matchedTags: [] });

    render(
      <MemoryRouter>
        <SymptomDiaryScreen />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/주변 .* 찾기/)).toBeNull();
  });
});
