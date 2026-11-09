// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SettingsScreen } from "./SettingsScreen";
import { getSettings, resetSettings } from "./store";
import { clearPremium } from "../subscribe/plan";
import { hasConsented, recordConsent, resetConsent } from "../shell/consent";

beforeEach(() => {
  resetSettings();
  clearPremium();
  resetConsent();
});
afterEach(() => {
  cleanup();
  resetSettings();
  clearPremium();
  resetConsent();
  localStorage.clear();
});

describe("SettingsScreen — 동의 철회", () => {
  function renderWithOnboarding() {
    return render(
      <MemoryRouter initialEntries={["/settings"]}>
        <Routes>
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/onboarding" element={<p>온보딩 화면</p>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("'동의 철회'를 누르면 확인 시트가 뜨고, 데이터는 두고 철회하면 동의만 지워지고 온보딩으로 간다", () => {
    recordConsent({ terms: true, health: true });
    localStorage.setItem("medid.visits.v1", "[]");
    renderWithOnboarding();
    fireEvent.click(screen.getByRole("button", { name: "동의 철회" }));
    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByText(/건강 정보 기록 동의를 철회/)).toBeTruthy();
    fireEvent.click(within(sheet).getByRole("button", { name: "데이터는 두고 철회" }));
    expect(hasConsented()).toBe(false);
    expect(localStorage.getItem("medid.visits.v1")).toBe("[]");
    expect(screen.getByText("온보딩 화면")).toBeTruthy();
  });

  it("'모두 지우고 철회'를 고르면 이 앱이 기기에 남긴 데이터가 전부 지워진다", () => {
    recordConsent({ terms: true, health: true });
    localStorage.setItem("medid.visits.v1", "[]");
    localStorage.setItem("medid.family.v1", "[]");
    renderWithOnboarding();
    fireEvent.click(screen.getByRole("button", { name: "동의 철회" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "모두 지우고 철회" }));
    expect(localStorage.getItem("medid.visits.v1")).toBeNull();
    expect(localStorage.getItem("medid.family.v1")).toBeNull();
    expect(hasConsented()).toBe(false);
    expect(screen.getByText("온보딩 화면")).toBeTruthy();
  });

  it("동의한 날짜와 약관 버전을 보여주고, 약관·방침 링크가 있다", () => {
    recordConsent({ terms: true, health: true }, new Date(2026, 10, 9, 9, 0).getTime());
    renderWithOnboarding();
    const sec = screen.getByRole("region", { name: "동의·개인정보" });
    expect(within(sec).getByText(/2026\.\s?11\.\s?9/)).toBeTruthy();
    expect(within(sec).getByRole("link", { name: "개인정보처리방침" }).getAttribute("href")).toBe("/privacy");
  });
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
