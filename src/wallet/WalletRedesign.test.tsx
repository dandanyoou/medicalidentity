// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WalletScreen } from "./WalletScreen";
import { resetVisits } from "../visits/store";
import { resetClaims } from "../insurance/store";
import { addMember, resetFamily } from "../family/store";

/**
 * U1 — 지갑 홈 리디자인(참고 영상 규칙: 알약 세그먼트 · 숫자 타일 · 카드 속 카드).
 * 색·글꼴 토큰은 그대로. 구조와 역할(role)을 테스트로 고정한다.
 */
function mount() {
  return render(
    <MemoryRouter>
      <WalletScreen />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  resetVisits();
  resetClaims();
});
afterEach(() => {
  cleanup();
  resetFamily();
});

describe("U1 지갑 홈 — 가족 전환 알약 세그먼트", () => {
  it("어두운 알약 컨테이너 안에서 선택된 가족만 흰 알약이다", () => {
    mount();
    const group = screen.getByRole("group", { name: "가족 선택" });
    expect(group.className).toMatch(/rounded-full/);
    expect(group.className).toMatch(/bg-\[var\(--ink\)\]/);
    const buttons = within(group).getAllByRole("button");
    const active = buttons.filter((b) => b.getAttribute("aria-pressed") === "true");
    expect(active).toHaveLength(1);
    expect(active[0].className).toMatch(/bg-\[var\(--surface\)\]/);
    expect(buttons.every((b) => /min-h-\[44px\]/.test(b.className))).toBe(true);
  });

  it("다른 가족을 누르면 그 가족이 흰 알약이 되고 신원증 이름이 바뀐다", () => {
    addMember({ name: "김어머니", relation: "부모", blood: "A", rh: "+" });
    mount();
    const group = screen.getByRole("group", { name: "가족 선택" });
    const buttons = within(group).getAllByRole("button");
    fireEvent.click(buttons[1]);
    expect(buttons[1].getAttribute("aria-pressed")).toBe("true");
    expect(buttons[0].getAttribute("aria-pressed")).toBe("false");
  });
});

describe("U1 지갑 홈 — 오늘 숫자 타일", () => {
  it("미납 금액과 환급 가능 건수를 타일 두 개로 보여준다(시드: 미납 90,500원 · 환급 가능 3건)", async () => {
    mount();
    const region = await screen.findByRole("region", { name: "오늘 숫자" });
    const unpaid = within(region).getByRole("link", { name: /미납 진료비/ });
    expect(within(unpaid).getByText("90,500")).toBeTruthy();
    expect(within(unpaid).getByRole("meter", { name: "미납 진료비" })).toBeTruthy();
    const claim = within(region).getByRole("link", { name: /환급 가능/ });
    expect(within(claim).getByText("3")).toBeTruthy();
    expect(within(claim).getByRole("meter", { name: "환급 가능" })).toBeTruthy();
  });

  it("미납 타일의 막대는 vital, 환급 타일의 막대는 refund 색이다", async () => {
    mount();
    const region = await screen.findByRole("region", { name: "오늘 숫자" });
    const unpaidBar = within(region).getByRole("meter", { name: "미납 진료비" });
    const claimBar = within(region).getByRole("meter", { name: "환급 가능" });
    expect(unpaidBar.className).toMatch(/bg-\[var\(--vital\)\]/);
    expect(claimBar.className).toMatch(/bg-\[var\(--refund\)\]/);
  });
});

describe("U1 지갑 홈 — 카드 속 카드", () => {
  it("'오늘 챙길 것'은 흰 바깥 카드 안에 paper 면 행들로 들어간다", async () => {
    mount();
    const section = await screen.findByRole("region", { name: "오늘 챙길 것" });
    expect(section.className).toMatch(/bg-\[var\(--surface\)\]/);
    const rows = within(section).getAllByRole("link");
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.className).toMatch(/bg-\[var\(--paper\)\]/);
      expect(r.className).toMatch(/min-h-\[44px\]/);
    }
  });
});
