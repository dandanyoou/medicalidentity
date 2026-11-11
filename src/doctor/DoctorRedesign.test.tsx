// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueuePanel } from "./QueuePanel";
import { localDateKey } from "./queue";
import { addVisit, resetVisits } from "../visits/store";

/**
 * U4 — 의사 화면 리디자인(참고 영상 규칙: 행 목록 · 환자 헤더 카드 · 표 · 카드 속 카드).
 * 대기열 정렬·문진 내용·진료 완료·지난 방문 필터는 바꾸지 않는다.
 */
const base = { memberId: "demo", hospital: "시연의원", dept: "가정의학과", amount: 0, paid: false } as const;

function mount() {
  return render(
    <MemoryRouter>
      <QueuePanel />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  resetVisits();
  addVisit({ ...base, patientName: "박영희", date: "2026-10-20", time: "10:00", reason: "두통", opinion: "긴장성 두통 의심 소견.", prescriptions: [{ drug: "아세트아미노펜 500mg", dose: "1정 3회/일", days: 3 }], status: "완료", paid: true });
  addVisit({ ...base, patientName: "박영희", date: localDateKey(), time: "11:00", reason: "머리가 또 아파요", status: "예약" });
  addVisit({ ...base, patientName: "이준호", date: localDateKey(), time: "11:30", reason: "복통", status: "예약" });
});
afterEach(() => {
  cleanup();
  resetVisits();
});

describe("U4 의사 화면 — 대기열 행 목록", () => {
  it("대기열은 paper 안쪽 카드에 헤어라인으로 나뉜 행이고, 행마다 이니셜 원이 있다", () => {
    mount();
    const list = screen.getByRole("list", { name: "오늘 대기열" });
    expect(list.className).toMatch(/bg-\[var\(--paper\)\]/);
    expect(list.className).toMatch(/divide-y/);
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("박").className).toMatch(/rounded-full/);
    expect(within(rows[1]).getByText("이").className).toMatch(/rounded-full/);
  });
});

describe("U4 의사 화면 — 환자 헤더 카드", () => {
  it("문진 카드를 열면 이니셜 원 · 이름 · 상태 칩 · 메타가 있는 환자 헤더가 보인다", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "박영희 사전 문진 보기" }));
    const head = screen.getByRole("group", { name: "환자" });
    expect(within(head).getByText("박영희")).toBeTruthy();
    expect(within(head).getByText("예약").className).toMatch(/rounded-full/);
    expect(within(head).getByText(/11:00 · 가정의학과/)).toBeTruthy();
  });
});

describe("U4 의사 화면 — 지난 방문 표", () => {
  it("지난 방문은 날짜 · 병원·과 · 소견 · 처방 열이 있는 표다", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "박영희 사전 문진 보기" }));
    const hist = screen.getByRole("region", { name: "지난 방문" });
    const table = within(hist).getByRole("table");
    const headers = within(table).getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["날짜", "병원 · 과", "소견", "처방"]);
    const row = within(table).getAllByRole("row")[1];
    expect(within(row).getByText("2026-10-20")).toBeTruthy();
    expect(within(row).getByText(/아세트아미노펜 500mg/)).toBeTruthy();
  });
});
