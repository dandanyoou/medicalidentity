// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BillingScreen } from "./BillingScreen";
import { resetVisits } from "../visits/store";

beforeEach(() => resetVisits());
afterEach(() => {
  cleanup();
  resetVisits();
});

describe("BillingScreen (수납 · 진료기록 · 시연)", () => {
  it("실제 결제가 아닌 '시연'임을 명확히 고지하고 미납 건을 보여준다", () => {
    render(
      <MemoryRouter>
        <BillingScreen />
      </MemoryRouter>,
    );
    expect(screen.getAllByText(/시연/).length).toBeGreaterThan(0);
    expect(screen.getByText(/실제 결제가 아닙니다/)).toBeTruthy();
    expect(screen.getByText("미납 2건")).toBeTruthy();
  });

  it("방문을 펼쳐 소견서·처방전을 보고, 수납하면 미납 수가 준다", () => {
    render(
      <MemoryRouter>
        <BillingScreen />
      </MemoryRouter>,
    );
    // 두통 방문 카드를 펼친다
    fireEvent.click(screen.getByText(/3일째 지속되는 두통/));
    expect(screen.getByText(/긴장성 두통으로 추정/)).toBeTruthy(); // 소견서
    expect(screen.getByText(/타이레놀/)).toBeTruthy(); // 처방전

    fireEvent.click(screen.getByRole("button", { name: /수납하기/ }));
    expect(screen.getByText("미납 1건")).toBeTruthy();
  });
});
