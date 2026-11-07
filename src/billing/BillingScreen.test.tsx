// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BillingScreen } from "./BillingScreen";

afterEach(() => cleanup());

describe("BillingScreen (수납 · 시연)", () => {
  it("실제 결제가 아닌 '시연'임을 명확히 고지한다", () => {
    render(
      <MemoryRouter>
        <BillingScreen />
      </MemoryRouter>,
    );
    expect(screen.getAllByText(/시연/).length).toBeGreaterThan(0);
    expect(screen.getByText(/실제 결제가 아닙니다/)).toBeTruthy();
  });

  it("결제하면 완료(시연) 확인이 뜬다", () => {
    render(
      <MemoryRouter>
        <BillingScreen />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getAllByRole("button", { name: /납부하기/ })[0]);
    expect(screen.getByText(/납부 완료/)).toBeTruthy();
  });
});
