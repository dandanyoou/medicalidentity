// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  listVisits,
  addVisit,
  payVisit,
  getVisit,
  unpaidVisits,
  resetVisits,
} from "./store";

beforeEach(() => resetVisits());
afterEach(() => resetVisits());

describe("visits store", () => {
  it("본인 데모 진료기록이 시드되어 있다", () => {
    const visits = listVisits("self");
    expect(visits.length).toBeGreaterThan(0);
    expect(visits[0].memberId).toBe("self");
  });

  it("미납 방문만 골라낸다", () => {
    const unpaid = unpaidVisits("self");
    expect(unpaid.every((v) => !v.paid)).toBe(true);
    expect(unpaid.length).toBeGreaterThan(0);
  });

  it("수납하면 paid=true, status=완료가 된다", () => {
    const target = unpaidVisits("self")[0];
    payVisit(target.id);
    const after = getVisit(target.id);
    expect(after?.paid).toBe(true);
    expect(after?.status).toBe("완료");
    expect(unpaidVisits("self").some((v) => v.id === target.id)).toBe(false);
  });

  it("방문을 추가하면 목록에 들어간다(예약 생성 등)", () => {
    const added = addVisit({
      memberId: "self",
      hospital: "세브란스병원",
      dept: "내과",
      date: "2026-12-01",
      reason: "복통",
      amount: 0,
      paid: false,
      status: "예약",
    });
    expect(added.id).toBeTruthy();
    expect(getVisit(added.id)?.hospital).toBe("세브란스병원");
  });
});
