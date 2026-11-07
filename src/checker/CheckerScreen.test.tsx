// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CheckerScreen } from "./CheckerScreen";

afterEach(() => cleanup());

describe("CheckerScreen (환급 파이프라인)", () => {
  it("상한액 초과면 '숨은 환급금 발견' + 받기 단계 + 무료 차별점을 보여준다", () => {
    render(
      <MemoryRouter>
        <CheckerScreen />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByPlaceholderText("0"), {
      target: { value: "10000000" }, // 1천만원 — 1분위 상한 초과
    });
    fireEvent.click(screen.getByRole("button", { name: "1" }));
    fireEvent.click(screen.getByRole("button", { name: /숨은 환급금 찾기/ }));

    expect(screen.getByText(/숨은 환급금 발견/)).toBeTruthy();
    expect(screen.getByText(/수수료/)).toBeTruthy(); // 차별점
    expect(screen.getByText(/The건강보험/)).toBeTruthy(); // 받기 1단계
  });

  it("받기 단계를 체크하면 진행률이 올라간다", () => {
    render(
      <MemoryRouter>
        <CheckerScreen />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByPlaceholderText("0"), {
      target: { value: "10000000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "1" }));
    fireEvent.click(screen.getByRole("button", { name: /숨은 환급금 찾기/ }));

    expect(screen.getByText("0/3 완료")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /The건강보험 앱에서 내 환급금 조회·신청 완료 표시/ }));
    expect(screen.getByText("1/3 완료")).toBeTruthy();
  });
});
