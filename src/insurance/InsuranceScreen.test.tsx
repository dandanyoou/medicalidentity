// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { InsuranceScreen } from "./InsuranceScreen";
import { resetVisits } from "../visits/store";
import { resetClaims } from "./store";

beforeEach(() => {
  resetVisits();
  resetClaims();
});
afterEach(() => {
  cleanup();
  resetVisits();
  resetClaims();
});

describe("InsuranceScreen (실손 청구)", () => {
  it("청구 가능한 진료를 보여주고, 시연임을 고지한다", () => {
    render(
      <MemoryRouter>
        <InsuranceScreen />
      </MemoryRouter>,
    );
    expect(screen.getByText("청구 가능한 진료")).toBeTruthy();
    expect(screen.getAllByText(/시연/).length).toBeGreaterThan(0);
  });

  it("청구 가능 합계 요약과, 청구 0건일 때 청구 현황 빈 상태를 보여준다", () => {
    render(
      <MemoryRouter>
        <InsuranceScreen />
      </MemoryRouter>,
    );
    expect(screen.getByText("청구 가능 3건")).toBeTruthy();
    expect(screen.getByText("청구 현황")).toBeTruthy();
    expect(screen.getByText(/아직 청구한 건이 없어요/)).toBeTruthy();
  });

  it("보험사를 골라 청구하면 청구 현황에 접수로 뜬다", () => {
    render(
      <MemoryRouter>
        <InsuranceScreen />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getAllByRole("button", { name: /실손 청구하기/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: "삼성화재" }));
    fireEvent.click(screen.getByRole("button", { name: /실손 청구 제출/ }));

    expect(screen.getByText("청구 현황")).toBeTruthy();
    // 상태 뱃지 + 스텝퍼 라벨 둘 다 "접수"라 복수 매칭
    expect(screen.getAllByText("접수").length).toBeGreaterThan(0);
    expect(screen.getAllByText("삼성화재").length).toBeGreaterThan(0);
  });
});
