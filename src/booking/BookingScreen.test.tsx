// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BookingScreen } from "./BookingScreen";

afterEach(() => cleanup());

describe("BookingScreen (예약 · 시연)", () => {
  it("실제 병원 연동이 아닌 '시연'임을 명확히 고지한다", () => {
    render(
      <MemoryRouter>
        <BookingScreen />
      </MemoryRouter>,
    );
    expect(screen.getAllByText(/시연/).length).toBeGreaterThan(0);
    expect(screen.getByText(/실제 병원 연동이 아닙니다/)).toBeTruthy();
  });

  it("예약하면 완료(시연) 확인이 뜬다", () => {
    render(
      <MemoryRouter>
        <BookingScreen />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /예약하기/ }));
    expect(screen.getByText(/예약 완료/)).toBeTruthy();
  });
});
