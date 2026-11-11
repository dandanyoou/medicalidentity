// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { OnboardingScreen } from "./OnboardingScreen";
import { hasSeenOnboarding, resetOnboarding } from "./onboarding";
import { hasConsented, readConsent, resetConsent } from "./consent";

function renderIt() {
  return render(
    <MemoryRouter initialEntries={["/onboarding"]}>
      <Routes>
        <Route path="/onboarding" element={<OnboardingScreen />} />
        <Route path="/wallet" element={<p>홈 화면</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  resetOnboarding();
  resetConsent();
});
afterEach(() => {
  cleanup();
  resetOnboarding();
  resetConsent();
});

describe("OnboardingScreen — 동의 없이는 시작할 수 없다", () => {
  it("마지막 장에서 약관·개인정보 동의와 건강정보 동의를 모두 체크해야 시작할 수 있고, 동의가 기록된다", () => {
    renderIt();
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    const start = screen.getByRole("button", { name: "시작하기" }) as HTMLButtonElement;
    expect(start.disabled).toBe(true);

    fireEvent.click(screen.getByLabelText(/이용약관.*개인정보처리방침.*동의/));
    expect(start.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(/건강 정보.*동의/));
    expect(start.disabled).toBe(false);

    fireEvent.click(start);
    expect(screen.getByText("홈 화면")).toBeTruthy();
    expect(hasSeenOnboarding()).toBe(true);
    expect(hasConsented()).toBe(true);
    expect(readConsent()?.at).toBeGreaterThan(0);
  });

  it("'건너뛰기'는 동의 장으로 건너뛸 뿐, 동의 없이 홈으로 가지 않는다", () => {
    renderIt();
    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));
    expect(screen.queryByText("홈 화면")).toBeNull();
    expect(screen.getByRole("button", { name: "시작하기" })).toBeTruthy();
    expect(hasSeenOnboarding()).toBe(false);
  });

  it("동의 장에 약관·방침 전문으로 가는 링크가 있다", () => {
    renderIt();
    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));
    expect(screen.getByRole("link", { name: "이용약관" }).getAttribute("href")).toBe("/terms");
    expect(screen.getByRole("link", { name: "개인정보처리방침" }).getAttribute("href")).toBe("/privacy");
  });
});
