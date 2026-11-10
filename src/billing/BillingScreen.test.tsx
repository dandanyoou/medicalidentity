// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BillingScreen } from "./BillingScreen";
import { addVisit, completeVisit, listVisits, resetVisits } from "../visits/store";
import { localDateKey } from "../doctor/queue";
import { getRating } from "../visits/ratings";

beforeEach(() => {
  resetVisits();
  localStorage.removeItem("medid.ratings");
});
afterEach(() => {
  cleanup();
  resetVisits();
});

describe("BillingScreen — 다시 올 때·복약 알림(R7, 기기 알림 시연)", () => {
  it("재진 권고와 복약 중인 처방이 카드로 보이고, 기기 알림 켜기 버튼이 있다", () => {
    const v = addVisit({
      memberId: "self",
      hospital: "행복의원",
      dept: "가정의학과",
      date: localDateKey(),
      time: "09:00",
      reason: "두통",
      amount: 0,
      paid: false,
      status: "예약",
    });
    completeVisit(v.id, {
      opinion: "긴장성 두통 의심 소견.",
      prescriptions: [{ drug: "아세트아미노펜 500mg", dose: "1정 3회/일", days: 3 }],
      amount: 12000,
      followUpDays: 14,
    });
    render(
      <MemoryRouter>
        <BillingScreen />
      </MemoryRouter>,
    );
    const card = screen.getByRole("region", { name: "다시 올 때 · 복약" });
    expect(within(card).getByText(/재진 권고/)).toBeTruthy();
    expect(within(card).getByText(/D-14/)).toBeTruthy();
    expect(within(card).getByText(/아세트아미노펜 500mg/)).toBeTruthy();
    expect(within(card).getByText(/1정 3회\/일/)).toBeTruthy();
    expect(within(card).getByRole("link", { name: /재진 예약/ })).toBeTruthy();
    expect(within(card).getByRole("button", { name: /기기 알림/ })).toBeTruthy();
    expect(within(card).getAllByText(/시연/).length).toBeGreaterThan(0);
  });

  it("재진·복약이 없으면 안내 한 줄만 보인다", () => {
    render(
      <MemoryRouter>
        <BillingScreen />
      </MemoryRouter>,
    );
    const card = screen.getByRole("region", { name: "다시 올 때 · 복약" });
    expect(within(card).getByText(/지금은 다가온 재진·복약이 없어요/)).toBeTruthy();
  });
});

describe("BillingScreen — 진료 후 병원 평가(R8)", () => {
  it("수납이 끝난 방문에만 '병원은 어땠나요?'가 뜨고, 점수와 한 줄을 저장하면 평가가 표시된다", () => {
    const done = addVisit({ memberId: "self", hospital: "행복의원", dept: "가정의학과", date: "2026-11-01", time: "09:00", reason: "두통", amount: 12000, paid: true, status: "완료" });
    addVisit({ memberId: "self", hospital: "행복의원", dept: "가정의학과", date: "2026-11-02", time: "09:00", reason: "두통", amount: 12000, paid: false, status: "수납대기" });
    render(
      <MemoryRouter>
        <BillingScreen />
      </MemoryRouter>,
    );
    // 수납대기 방문에는 평가가 없다 → 평가 폼 수 = 완료 방문 수(저장소 기본 시연 방문 포함).
    const completed = listVisits().filter((v) => v.status === "완료").length;
    const groups = screen.getAllByRole("group", { name: "병원 평가" });
    expect(groups).toHaveLength(completed);
    const form = groups.find((g) => g.parentElement?.textContent?.includes("2026-11-01"))!;
    fireEvent.click(within(form).getByRole("button", { name: "4점" }));
    fireEvent.change(within(form).getByLabelText(/한 줄/), { target: { value: "대기 짧았어요" } });
    fireEvent.click(within(form).getByRole("button", { name: /평가 저장/ }));
    expect(getRating(done.id)).toMatchObject({ score: 4, comment: "대기 짧았어요" });
    expect(screen.getByText(/내 평가 4점/)).toBeTruthy();
    expect(screen.getAllByRole("group", { name: "병원 평가" })).toHaveLength(completed - 1);
  });
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
