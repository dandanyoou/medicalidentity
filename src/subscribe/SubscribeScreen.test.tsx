// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SubscribeScreen } from "./SubscribeScreen";
import { clearPremium } from "./plan";

beforeEach(() => clearPremium());
afterEach(() => {
  cleanup();
  clearPremium();
});

describe("SubscribeScreen (가족 프리미엄)", () => {
  it("플랜·가격·혜택을 보여준다", () => {
    render(
      <MemoryRouter>
        <SubscribeScreen />
      </MemoryRouter>,
    );
    expect(screen.getAllByText(/가족 프리미엄/).length).toBeGreaterThan(0);
    expect(screen.getByText(/3,900원/)).toBeTruthy();
    expect(screen.getByText(/가족 구성원 무제한 등록/)).toBeTruthy();
  });

  it("결제 키가 없으면 가짜 결제 대신 연동 설정 안내를 보여준다", () => {
    render(
      <MemoryRouter>
        <SubscribeScreen />
      </MemoryRouter>,
    );
    expect(screen.getByText(/결제 연동 준비됨/)).toBeTruthy();
    expect(screen.getByText(/VITE_TOSS_CLIENT_KEY/)).toBeTruthy();
  });
});
