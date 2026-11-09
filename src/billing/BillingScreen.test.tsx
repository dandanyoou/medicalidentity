// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BillingScreen } from "./BillingScreen";
import { addVisit, completeVisit, resetVisits } from "../visits/store";

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

  it("예약은 미납으로 세지 않고, 예약 배지를 달며 수납 버튼이 없다", () => {
    addVisit({
      memberId: "self",
      hospital: "세브란스병원",
      dept: "가정의학과",
      date: "2099-01-01",
      reason: "머리가 아파요",
      amount: 0,
      paid: false,
      status: "예약",
    });
    render(
      <MemoryRouter>
        <BillingScreen />
      </MemoryRouter>,
    );
    expect(screen.getByText("미납 2건")).toBeTruthy();
    expect(screen.getByText("예약")).toBeTruthy(); // 접힌 카드의 상태 배지
    fireEvent.click(screen.getByText("머리가 아파요"));
    expect(screen.queryByRole("button", { name: /수납하기/ })).toBeNull();
  });

  it("의사가 진료를 마친 방문은 소견·처방·진료비와 함께 수납대기로 떠서 바로 수납할 수 있다", () => {
    const v = addVisit({
      memberId: "self",
      hospital: "서울대학교병원",
      dept: "가정의학과",
      date: "2099-01-02",
      reason: "머리가 아파요",
      amount: 0,
      paid: false,
      status: "예약",
    });
    completeVisit(v.id, {
      opinion: "긴장성 두통 소견. 휴식 권고.",
      prescriptions: [{ drug: "아세트아미노펜 500mg", dose: "1정 3회/일", days: 3 }],
      amount: 18500,
    });
    render(
      <MemoryRouter>
        <BillingScreen />
      </MemoryRouter>,
    );
    expect(screen.getByText("미납 3건")).toBeTruthy();
    fireEvent.click(screen.getByText("머리가 아파요"));
    expect(screen.getByText(/긴장성 두통 소견/)).toBeTruthy();
    expect(screen.getByText("아세트아미노펜 500mg")).toBeTruthy();
    expect(screen.getByRole("button", { name: /수납하기 · 18,500원/ })).toBeTruthy();
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

    // 수납하기 → 바로 수납이 아니라 확인 시트(병원·금액·시연 고지)가 뜬다
    fireEvent.click(screen.getByRole("button", { name: /수납하기 · 38,400원/ }));
    const sheet = screen.getByRole("dialog", { name: "진료비를 수납할까요?" });
    expect(sheet).toBeTruthy();
    expect(screen.getByText("미납 2건")).toBeTruthy(); // 아직 수납 전

    fireEvent.click(screen.getByRole("button", { name: "38,400원 수납하기" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("미납 1건")).toBeTruthy();
  });
});
