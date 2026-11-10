// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DocumentsScreen } from "./DocumentsScreen";
import { addVisit, resetVisits } from "../visits/store";
import { issueBadge, registerHospital, type Session } from "../hospital/badge";
import { issueDocument, listDocuments, RELAY_DAYS } from "./store";

const DAY = 86_400_000;

function doctor(): Session {
  const b = issueBadge({ name: "김의사", role: "doctor" });
  return { badgeId: b.id, hospitalName: b.hospitalName, name: b.name, role: "doctor", exp: b.exp };
}

function visit() {
  return addVisit({
    memberId: "self",
    hospital: "행복의원",
    dept: "가정의학과",
    date: "2026-11-11",
    time: "10:00",
    reason: "머리가 아파요",
    opinion: "긴장성 두통 의심 소견. 휴식 권고.",
    prescriptions: [{ drug: "아세트아미노펜 500mg", dose: "1정 3회/일", days: 3 }],
    amount: 18_500,
    paid: false,
    status: "수납대기",
  });
}

function mount() {
  return render(
    <MemoryRouter>
      <DocumentsScreen />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  resetVisits();
  registerHospital({ name: "행복의원", admin: "박원무" });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("DocumentsScreen — 환자 서류함(R5·P4)", () => {
  it("받은 서류가 없으면 안내만 보인다", () => {
    mount();
    expect(screen.getByRole("heading", { level: 1, name: "서류함" })).toBeTruthy();
    expect(screen.getByText(/병원에서 보낸 서류가 여기에/)).toBeTruthy();
  });

  it("보낸 서류는 종류·병원·'7일 안에 열어주세요'로 목록에 뜨고, 열면 받음 처리되고 병원 서명 확인이 보인다", async () => {
    const v = visit();
    issueDocument({ visit: v, kind: "진단서", session: doctor(), now: Date.now() });
    mount();
    const list = screen.getByRole("list", { name: "받은 서류" });
    expect(within(list).getByText("진단서")).toBeTruthy();
    expect(within(list).getByText(/행복의원/)).toBeTruthy();
    expect(within(list).getByText(new RegExp(`${RELAY_DAYS}일 안에`))).toBeTruthy();

    fireEvent.click(within(list).getByRole("button", { name: /진단서 열기/ }));
    const doc = screen.getByRole("article", { name: "진단서" });
    expect(within(doc).getByText(/긴장성 두통 의심 소견/)).toBeTruthy();
    expect(within(doc).getByText(/김의사/)).toBeTruthy();
    expect(await within(doc).findByText(/행복의원 서명 확인됨/)).toBeTruthy();
    expect(listDocuments()[0].status).toBe("received");
  });

  it("'PDF로 저장 · 인쇄'는 브라우저 인쇄를 연다", () => {
    const v = visit();
    issueDocument({ visit: v, kind: "진료비 영수증", session: doctor(), now: Date.now() });
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    mount();
    fireEvent.click(screen.getByRole("button", { name: /진료비 영수증 열기/ }));
    fireEvent.click(screen.getByRole("button", { name: /PDF로 저장/ }));
    expect(print).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/18,500원/)).toBeTruthy();
  });

  it("7일이 지나 안 연 서류는 '기한이 지나 폐기됨'으로 표시되고 열 수 없다", () => {
    const v = visit();
    issueDocument({ visit: v, kind: "소견서", session: doctor(), now: Date.now() - (RELAY_DAYS + 1) * DAY });
    mount();
    const list = screen.getByRole("list", { name: "받은 서류" });
    expect(within(list).getByText(/기한이 지나 폐기됨/)).toBeTruthy();
    expect(within(list).queryByRole("button", { name: /소견서 열기/ })).toBeNull();
    expect(listDocuments()[0].status).toBe("expired");
  });

  it("내용이 고쳐진 서류는 '서명이 맞지 않음'으로 경고한다", async () => {
    const v = visit();
    const d = issueDocument({ visit: v, kind: "진단서", session: doctor(), now: Date.now() });
    const tampered = [{ ...d, body: { ...d.body, opinion: "고친 소견" } }];
    localStorage.setItem("medid.documents", JSON.stringify(tampered));
    mount();
    fireEvent.click(screen.getByRole("button", { name: /진단서 열기/ }));
    expect(await screen.findByText(/서명이 맞지 않음/)).toBeTruthy();
  });
});
