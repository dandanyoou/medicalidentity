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
    expect(screen.getByText("접수")).toBeTruthy();
    expect(screen.getAllByText("삼성화재").length).toBeGreaterThan(0);
  });
});
