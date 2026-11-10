// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { addVisit, listVisits, resetVisits } from "../visits/store";
import { EMPTY_ANSWERS, answer, buildRecord, type IntakeAnswers } from "../intake/engine";
import { computeHospitalStats } from "./dashboard";

beforeEach(() => resetVisits());

const TODAY = "2026-11-10";

function intake(startedAt?: number, confirmedAt = 1_000_000) {
  const a = [["머리"], "욱신", "1-3일", 5, ["없음"], ["없음"]].reduce<IntakeAnswers>(
    (acc, v) => answer(acc, v as string | string[] | number),
    EMPTY_ANSWERS,
  );
  return buildRecord(a, "", confirmedAt, startedAt);
}

function visit(over: Partial<Parameters<typeof addVisit>[0]> = {}) {
  return addVisit({
    memberId: "self",
    hospital: "행복의원",
    dept: "가정의학과",
    date: TODAY,
    time: "10:00",
    reason: "머리가 아파요",
    amount: 0,
    paid: false,
    status: "예약",
    ...over,
  });
}

describe("병원 대시보드 집계 — 기기 저장 데이터에서", () => {
  it("문진 기록에 시작 시각이 남고, 저장소를 거쳐도 유지된다", () => {
    const r = intake(1_000_000 - 90, 1_000_000);
    expect(r.startedAt).toBe(1_000_000 - 90);
    const v = visit({ intake: r });
    expect(listVisits().find((x) => x.id === v.id)?.intake?.startedAt).toBe(1_000_000 - 90);
  });

  it("표본이 없으면 모든 값이 null(화면에서 '아직 데이터 없음')", () => {
    const s = computeHospitalStats([], { today: TODAY });
    expect(s.intakeCompleted).toBe(0);
    expect(s.avgIntakeSeconds).toBeNull();
    expect(s.accuracy).toBeNull();
    expect(s.visitRate).toBeNull();
    expect(s.documentsIssued).toBeNull();
  });

  it("문진 완료 수·평균 소요(시작 시각 있는 것만)·추천 일치율·예약 대비 방문을 센다", () => {
    // 시각은 ms — 60초·120초 전에 시작 → 평균 90초
    visit({ intake: intake(1_000_000 - 60_000), status: "완료", paid: true, doctorReview: { verdict: "맞음", recommended: ["가정의학과"], at: 1 } });
    visit({ intake: intake(1_000_000 - 120_000), status: "수납대기", doctorReview: { verdict: "다른 과", actualDept: "신경과", recommended: ["가정의학과"], at: 1 } });
    visit({ intake: intake(undefined), status: "예약" }); // 시작 시각 없음 → 평균에서 제외
    visit({ status: "예약", date: "2026-12-01" }); // 미래 예약 → 방문율 분모에서 제외
    visit({ status: "예약", date: "2026-11-01" }); // 지난 예약인데 안 옴

    // 저장소에는 기본 시연 방문(수납대기·완료)이 함께 있어 이 테스트의 방문만 골라 센다.
    const mine = listVisits().filter((v) => v.hospital === "행복의원");
    const s = computeHospitalStats(mine, { today: TODAY });
    expect(s.intakeCompleted).toBe(3);
    expect(s.avgIntakeSeconds).toBe(90);
    expect(s.reviewed).toBe(2);
    expect(s.accuracy).toBe(50);
    expect(s.bookedDue).toBe(4); // 오늘까지 예약 4건
    expect(s.visited).toBe(2);
    expect(s.visitRate).toBe(50);
    expect(s.documentsIssued).toBeNull(); // 발급된 서류가 없으면 null
  });

  it("발급된 서류 수를 넘기면 그대로 센다", () => {
    const s = computeHospitalStats([], { today: TODAY, documentsIssued: 3 });
    expect(s.documentsIssued).toBe(3);
    expect(computeHospitalStats([], { today: TODAY, documentsIssued: 0 }).documentsIssued).toBeNull();
  });
});
