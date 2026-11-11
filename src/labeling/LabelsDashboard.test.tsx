// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LabelsDashboard } from "./LabelsDashboard";
import { addRecord, clearRecords } from "./store";
import { addVisit, resetVisits, reviewVisit } from "../visits/store";

beforeEach(() => clearRecords());
afterEach(() => {
  cleanup();
  clearRecords();
});

function renderDash() {
  render(
    <MemoryRouter>
      <LabelsDashboard />
    </MemoryRouter>,
  );
}

describe("LabelsDashboard", () => {
  it("레코드가 없으면 빈 상태 안내", () => {
    renderDash();
    expect(screen.getByText(/아직 수집된 라벨이 없어요/)).toBeTruthy();
  });

  it("의사가 확인한 추천 진료과 결과를 집계해 보여준다(라벨 레코드가 없어도)", () => {
    resetVisits();
    const base = { memberId: "self", hospital: "A", date: "2026-11-09", reason: "r", amount: 0, paid: false, status: "예약" as const };
    const a = addVisit({ ...base, dept: "가정의학과" });
    const b = addVisit({ ...base, dept: "가정의학과" });
    const c = addVisit({ ...base, dept: "가정의학과" });
    reviewVisit(a.id, { verdict: "맞음", recommended: ["가정의학과"] });
    reviewVisit(b.id, { verdict: "맞음", recommended: ["가정의학과"] });
    reviewVisit(c.id, { verdict: "다른 과", actualDept: "정형외과", recommended: ["가정의학과"] });
    renderDash();
    const sec = screen.getByRole("region", { name: "추천 진료과 의사 확인" });
    expect(within(sec).getByText("의사 확인 3건")).toBeTruthy();
    expect(within(sec).getByText(/맞음 2/)).toBeTruthy();
    expect(within(sec).getByText(/다른 과 1/)).toBeTruthy();
    expect(within(sec).getByText(/정확도 67%/)).toBeTruthy();
    expect(within(sec).getByText(/가정의학과 → 정형외과/)).toBeTruthy();
    resetVisits();
  });

  it("레코드가 있으면 수집량·검증 수와 내보내기 버튼을 보여준다", () => {
    addRecord({
      rawText: "머리가 아파요",
      autoTags: ["두통"],
      confirmedTags: ["두통"],
      rejectedTags: [],
      addedTags: [],
    });
    addRecord({
      rawText: "다리가 아파요",
      autoTags: ["다리 통증"],
      confirmedTags: [],
      rejectedTags: [],
      addedTags: [],
    });
    renderDash();
    expect(screen.getByText(/총 2건/)).toBeTruthy();
    expect(screen.getByText(/검증 1건/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /CSV/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /JSONL/ })).toBeTruthy();
    expect(screen.getAllByText("두통").length).toBeGreaterThan(0);
  });
});
