// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SymptomInfoScreen } from "./SymptomInfoScreen";
import { loadDiary } from "../wallet/diary";

function typeSymptom(text: string) {
  const input = screen.getByPlaceholderText(/머리가 아프고 속이 메스꺼워요/);
  fireEvent.change(input, { target: { value: text } });
}

// textarea는 입력값을 자식 텍스트 노드로 렌더링하므로, 입력값과 같은 글자의
// 제안 버튼을 getByText로 찾으면 textarea 자신과 겹쳐 모호해진다 — 버튼
// role로 좁혀서 찾는다.
function clickSuggestion(label: string) {
  fireEvent.click(screen.getByRole("button", { name: label }));
}

describe("SymptomInfoScreen — 자유 텍스트 입력", () => {
  afterEach(() => cleanup());

  it("증상을 입력하기 전에도 '의학적 진단이 아닙니다' 고지가 항상 보인다", () => {
    render(
      <MemoryRouter>
        <SymptomInfoScreen />
      </MemoryRouter>,
    );
    const alertText = screen.getByRole("alert").textContent ?? "";
    expect(alertText).toContain("의학적 진단이 아닙니다");
    expect(alertText).toContain("119");
  });

  it("label로 입력하면 바로 매칭 후보가 뜬다(예: '두통')", () => {
    render(
      <MemoryRouter>
        <SymptomInfoScreen />
      </MemoryRouter>,
    );
    typeSymptom("두통");
    expect(screen.getByRole("button", { name: "두통" })).toBeTruthy();
  });

  it("alias로 입력해도 매칭된다(예: '머리아픔' → 두통)", () => {
    render(
      <MemoryRouter>
        <SymptomInfoScreen />
      </MemoryRouter>,
    );
    typeSymptom("머리아픔");
    clickSuggestion("두통");
    expect(screen.getByText(/갑자기 극심한 두통/)).toBeTruthy();
  });

  it("자연스러운 문장 안에 포함된 증상도 찾아낸다(진단이 아니라 단순 단어 매칭)", () => {
    render(
      <MemoryRouter>
        <SymptomInfoScreen />
      </MemoryRouter>,
    );
    typeSymptom("어제 저녁부터 머리가 아프고 속이 메스꺼워요");
    expect(screen.getByRole("button", { name: "두통" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "메스꺼움" })).toBeTruthy();
  });

  it("증상을 선택하면 특정 병원이 아니라 진료과만 안내한다", () => {
    render(
      <MemoryRouter>
        <SymptomInfoScreen />
      </MemoryRouter>,
    );
    typeSymptom("두통");
    clickSuggestion("두통");
    // "신경과"는 <strong>으로 분리된 별도 텍스트 노드라 정규식 하나로는 못
    // 잡는다 — 두 조각을 따로 확인한다.
    expect(screen.getByText("신경과", { selector: "strong" })).toBeTruthy();
    expect(screen.getByText(/전문의가 진료합니다/)).toBeTruthy();
  });

  it("후보를 선택하면 참고 정보와 응급 신호 목록이 뜬다", () => {
    render(
      <MemoryRouter>
        <SymptomInfoScreen />
      </MemoryRouter>,
    );
    typeSymptom("발열");
    clickSuggestion("발열");
    expect(screen.getByText(/39도 이상 고열이 하루 이상 지속/)).toBeTruthy();
    expect(screen.getByText("이런 증상이 함께 있으면 바로 응급실/119")).toBeTruthy();
  });

  it("'찾기' 버튼 옆에 특정 병원을 추천하지 않는다는 문구가 항상 붙어있다", () => {
    render(
      <MemoryRouter>
        <SymptomInfoScreen />
      </MemoryRouter>,
    );
    typeSymptom("기침");
    clickSuggestion("기침");
    expect(screen.getByText(/특정 병원을\s*골라서 추천하지 않습니다/)).toBeTruthy();
  });

  it("등록되지 않은 증상은 지어내지 않고 솔직하게 '등록된 정보가 없다'고 말한다", () => {
    render(
      <MemoryRouter>
        <SymptomInfoScreen />
      </MemoryRouter>,
    );
    typeSymptom("아무도모르는희귀증상XYZ");
    expect(screen.getByText(/등록된 정보가 없는 증상/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "주변 병원 찾기" })).toBeTruthy();
  });
});

describe("SymptomInfoScreen — 주변 찾기 (네이버 지도로 그대로 넘기기, 알고리즘 추천 아님)", () => {
  beforeEach(() => {
    vi.spyOn(window, "open").mockImplementation(() => null);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("증상을 선택하면 네이버 지도에서 해당 진료과를 검색하는 새 탭을 연다", () => {
    render(
      <MemoryRouter>
        <SymptomInfoScreen />
      </MemoryRouter>,
    );
    typeSymptom("두통");
    clickSuggestion("두통");
    fireEvent.click(screen.getByRole("button", { name: "주변 신경과 찾기" }));

    expect(window.open).toHaveBeenCalledTimes(1);
    const [url] = (window.open as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("map.naver.com");
    expect(decodeURIComponent(url)).toContain("신경과");
  });

  it("매칭 안 된 증상에서도 '주변 병원 찾기'는 동작한다", () => {
    render(
      <MemoryRouter>
        <SymptomInfoScreen />
      </MemoryRouter>,
    );
    typeSymptom("아무도모르는희귀증상XYZ");
    fireEvent.click(screen.getByRole("button", { name: "주변 병원 찾기" }));

    expect(window.open).toHaveBeenCalledTimes(1);
    const [url] = (window.open as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("map.naver.com");
    expect(decodeURIComponent(url)).toContain("병원");
  });
});

describe("SymptomInfoScreen — 증상 일기 저장", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("원문을 그대로, 매칭된 태그와 함께 일기에 저장한다", () => {
    render(
      <MemoryRouter>
        <SymptomInfoScreen />
      </MemoryRouter>,
    );
    typeSymptom("어제 저녁부터 머리가 아프고 속이 메스꺼워요");
    fireEvent.click(screen.getByRole("button", { name: "증상 일기에 저장" }));

    const diary = loadDiary();
    expect(diary).toHaveLength(1);
    expect(diary[0].rawText).toBe("어제 저녁부터 머리가 아프고 속이 메스꺼워요");
    expect(diary[0].matchedTags.sort()).toEqual(["두통", "메스꺼움"].sort());
  });

  it("언제부터·강도·메모를 같이 저장할 수 있다", () => {
    render(
      <MemoryRouter>
        <SymptomInfoScreen />
      </MemoryRouter>,
    );
    typeSymptom("두통");
    fireEvent.change(screen.getByPlaceholderText("예: 어제 저녁부터"), {
      target: { value: "오늘 아침부터" },
    });
    fireEvent.click(screen.getByRole("button", { name: "4" }));
    fireEvent.change(screen.getByPlaceholderText("예: 빛을 보면 더 아파요"), {
      target: { value: "눈이 침침해요" },
    });
    fireEvent.click(screen.getByRole("button", { name: "증상 일기에 저장" }));

    const diary = loadDiary();
    expect(diary[0].onset).toBe("오늘 아침부터");
    expect(diary[0].severity).toBe(4);
    expect(diary[0].note).toBe("눈이 침침해요");
  });

  it("매칭 안 된 증상이어도 원문은 그대로 일기에 저장된다(지어내지 않지만 기록은 남김)", () => {
    render(
      <MemoryRouter>
        <SymptomInfoScreen />
      </MemoryRouter>,
    );
    typeSymptom("아무도모르는희귀증상XYZ");
    fireEvent.click(screen.getByRole("button", { name: "증상 일기에 저장" }));

    const diary = loadDiary();
    expect(diary[0].rawText).toBe("아무도모르는희귀증상XYZ");
    expect(diary[0].matchedTags).toEqual([]);
  });
});
