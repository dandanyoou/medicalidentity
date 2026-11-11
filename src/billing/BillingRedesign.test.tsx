// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BillingScreen } from "./BillingScreen";
import { resetVisits } from "../visits/store";

/**
 * U5 — 수납·진료기록 리디자인(참고 영상 규칙: 숫자 타일 · 표 · 카드 속 카드).
 * 수납 흐름·금액·상태 배지·평가·알림 카드는 바꾸지 않는다. 시드: 미납 2건 90,500원, 완료 1건 21,000원.
 */
function mount() {
  return render(
    <MemoryRouter>
      <BillingScreen />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  resetVisits();
});
afterEach(() => cleanup());

describe("U5 수납 — 금액 타일", () => {
  it("미납 진료비(vital)와 낸 진료비(refund) 타일 두 개가 점선 미터와 함께 보인다", () => {
    mount();
    const region = screen.getByRole("region", { name: "수납 숫자" });
    const unpaid = within(region).getByRole("meter", { name: "미납 진료비" });
    expect(unpaid.className).toMatch(/bg-\[var\(--vital\)\]/);
    expect(within(region).getByText("90,500")).toBeTruthy();
    expect(within(region).getByText("미납 2건")).toBeTruthy();
    const paid = within(region).getByRole("meter", { name: "낸 진료비" });
    expect(paid.className).toMatch(/bg-\[var\(--refund\)\]/);
    expect(within(region).getByText("21,000")).toBeTruthy();
  });
});

describe("U5 수납 — 진료 기록 표", () => {
  it("진료 기록은 병원·과 / 날짜 / 금액·상태 열이 있는 표이고 방문마다 한 행이다", () => {
    mount();
    const table = screen.getByRole("table", { name: "진료 기록" });
    const headers = within(table).getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["병원 · 과", "날짜", "금액 · 상태"]);
    // 헤더 1행 + 방문 3행(접힌 상태) + 수납완료 방문의 평가 행 1
    expect(within(table).getAllByRole("row")).toHaveLength(5);
    expect(within(table).getAllByRole("button", { expanded: false })).toHaveLength(3);
    expect(within(table).getByText("2026-11-05")).toBeTruthy();
  });

  it("행을 펼치면 상세가 paper 안쪽 카드로 열리고 수납 버튼은 그대로다", () => {
    mount();
    fireEvent.click(screen.getByText(/3일째 지속되는 두통/));
    const detail = screen.getByRole("group", { name: "진료 상세" });
    expect(detail.className).toMatch(/bg-\[var\(--paper\)\]/);
    expect(within(detail).getByRole("button", { name: /수납하기 · 38,400원/ })).toBeTruthy();
  });
});
