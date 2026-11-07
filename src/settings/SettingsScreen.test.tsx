// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SettingsScreen } from "./SettingsScreen";
import { getSettings, resetSettings } from "./store";
import { clearPremium } from "../subscribe/plan";

beforeEach(() => {
  resetSettings();
  clearPremium();
});
afterEach(() => {
  cleanup();
  resetSettings();
  clearPremium();
});

describe("SettingsScreen (알림 설정)", () => {
  it("토글을 끄면 저장된다", () => {
    render(
      <MemoryRouter>
        <SettingsScreen />
      </MemoryRouter>,
    );
    const sw = screen.getByRole("switch", { name: "병원 이탈 시 미납 알림" });
    expect(sw.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(sw);
    expect(getSettings().unpaidAlert).toBe(false);
  });

  it("미구독이면 환급 자동 재확인은 켜지지 않고 구독 안내가 뜬다", () => {
    render(
      <MemoryRouter>
        <SettingsScreen />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("switch", { name: "매년 환급 자동 재확인" }));
    expect(getSettings().refundAutoCheck).toBe(false);
    expect(screen.getByText(/프리미엄 기능이에요/)).toBeTruthy();
  });
});
