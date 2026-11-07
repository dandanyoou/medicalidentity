// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MoreScreen } from "./MoreScreen";

afterEach(() => cleanup());

describe("MoreScreen (더보기)", () => {
  it("부가 도구·구독·의사 화면·앱 정보를 보여준다", () => {
    render(
      <MemoryRouter>
        <MoreScreen />
      </MemoryRouter>,
    );
    expect(screen.getByText("증상 정보")).toBeTruthy();
    expect(screen.getByText("라벨링 현황")).toBeTruthy();
    expect(screen.getByText(/가족 프리미엄/)).toBeTruthy();
    expect(screen.getByText("의사 화면")).toBeTruthy();
    expect(screen.getByText(/서버로 전송되지 않습니다/)).toBeTruthy();
  });

  it("설치 신호가 없으면 '홈 화면에 추가' 수동 안내를 보여준다", () => {
    render(
      <MemoryRouter>
        <MoreScreen />
      </MemoryRouter>,
    );
    // 제목 + 안내문 안의 강조 둘 다 "홈 화면에 추가"라 복수 매칭
    expect(screen.getAllByText("홈 화면에 추가").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/브라우저 메뉴에서/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "설치" })).toBeNull();
  });
});
