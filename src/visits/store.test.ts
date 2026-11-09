// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  listVisits,
  addVisit,
  payVisit,
  getVisit,
  unpaidVisits,
  resetVisits,
  removeVisitsByIdPrefix,
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

  it("예약(진료 전)은 미납이 아니다", () => {
    const before = unpaidVisits("self").length;
    addVisit({
      memberId: "self",
      hospital: "세브란스병원",
      dept: "내과",
      date: "2026-12-01",
      reason: "복통",
      amount: 0,
      paid: false,
      status: "예약",
    });
    expect(unpaidVisits("self")).toHaveLength(before);
    expect(unpaidVisits("self").every((v) => v.status === "수납대기")).toBe(true);
  });

  it("저장된 값에 형태가 깨진 항목이 있으면 그 항목만 뺀다", () => {
    const good = {
      id: "v-ok",
      memberId: "self",
      hospital: "서울대학교병원",
      dept: "내과",
      date: "2026-11-01",
      reason: "기침",
      amount: 10000,
      paid: false,
      status: "수납대기",
    };
    localStorage.setItem(
      "medid.visits.v1",
      JSON.stringify([{ id: "broken" }, { ...good, id: "v-nan", amount: "만원" }, good]),
    );
    const all = listVisits();
    expect(all.map((v) => v.id)).toEqual(["v-ok"]);
    expect(unpaidVisits().reduce((s, v) => s + v.amount, 0)).toBe(10000);
  });

  it("문진 기록(intake)이 붙은 방문은 그대로 저장·조회된다", () => {
    const added = addVisit({
      memberId: "self",
      hospital: "서울대학교병원",
      dept: "가정의학과",
      date: "2026-11-09",
      reason: "오늘부터 머리가 욱신욱신 아파요.",
      amount: 0,
      paid: false,
      status: "예약",
      intake: {
        parts: ["머리"],
        quality: { 머리: "욱신" },
        onset: "오늘",
        severity: 5,
        triggers: ["특별히 없음"],
        associated: ["없음"],
        summary: "오늘부터 머리가 욱신욱신 아파요.",
        confirmedAt: 1,
      },
    });
    expect(getVisit(added.id)?.intake?.parts).toEqual(["머리"]);
    expect(getVisit(added.id)?.intake?.severity).toBe(5);
  });

  it("문진 기록 형태가 깨졌으면 방문은 남기고 문진 기록만 뺀다", () => {
    localStorage.setItem(
      "medid.visits.v1",
      JSON.stringify([
        {
          id: "x",
          memberId: "self",
          hospital: "A병원",
          dept: "내과",
          date: "2026-11-09",
          reason: "배가 아파요",
          amount: 0,
          paid: false,
          status: "예약",
          intake: { parts: "배", summary: 3 },
        },
      ]),
    );
    const v = getVisit("x");
    expect(v?.hospital).toBe("A병원");
    expect(v?.intake).toBeUndefined();
  });

  it("id 접두어로 방문을 지울 수 있다(시연 환자 정리용) — 다른 방문은 남는다", () => {
    addVisit({ id: "demo-1", memberId: "demo", patientName: "박영희", hospital: "A", dept: "내과", date: "2026-11-09", reason: "r", amount: 0, paid: false, status: "예약" } as never);
    const added = addVisit({ memberId: "self", hospital: "B", dept: "내과", date: "2026-11-09", reason: "r", amount: 0, paid: false, status: "예약" });
    removeVisitsByIdPrefix("demo-");
    expect(getVisit("demo-1")).toBeUndefined();
    expect(getVisit(added.id)).toBeTruthy();
  });

  it("patientName은 문자열이어야 하고, 아니면 그 방문을 건너뛴다", () => {
    localStorage.setItem(
      "medid.visits.v1",
      JSON.stringify([
        { id: "ok", memberId: "demo", patientName: "박영희", hospital: "A", dept: "내과", date: "2026-11-09", reason: "r", amount: 0, paid: false, status: "예약" },
        { id: "bad", memberId: "demo", patientName: 7, hospital: "A", dept: "내과", date: "2026-11-09", reason: "r", amount: 0, paid: false, status: "예약" },
      ]),
    );
    expect(getVisit("ok")?.patientName).toBe("박영희");
    expect(getVisit("bad")).toBeUndefined();
  });

  it("저장된 값이 JSON이 아니면 시드로 돌아간다", () => {
    localStorage.setItem("medid.visits.v1", "{not json");
    expect(listVisits("self").length).toBeGreaterThan(0);
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
