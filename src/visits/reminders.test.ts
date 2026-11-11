import { describe, expect, it } from "vitest";
import type { Visit } from "./store";
import { addDays, buildReminders } from "./reminders";

function v(over: Partial<Visit> & { id: string }): Visit {
  return {
    memberId: "self",
    hospital: "행복의원",
    dept: "가정의학과",
    date: "2026-11-01",
    time: "10:00",
    reason: "머리가 아파요",
    amount: 0,
    paid: false,
    status: "완료",
    ...over,
  };
}

describe("재방문 고리 — 재진·복약 알림(R7)", () => {
  it("날짜 더하기", () => {
    expect(addDays("2026-11-01", 14)).toBe("2026-11-15");
    expect(addDays("2026-12-25", 10)).toBe("2027-01-04");
  });

  it("재진 권고가 있는 방문은 권고일 알림이 되고, 그 뒤로 잡힌 예약이 있으면 알림이 사라진다", () => {
    const done = v({ id: "a", date: "2026-11-01", followUp: { afterDays: 14 } });
    const r1 = buildReminders([done], { today: "2026-11-10" });
    expect(r1).toHaveLength(1);
    expect(r1[0]).toMatchObject({ kind: "재진", date: "2026-11-15", visitId: "a", hospital: "행복의원", dept: "가정의학과" });
    expect(r1[0].daysLeft).toBe(5);

    const booked = v({ id: "b", date: "2026-11-16", status: "예약" });
    expect(buildReminders([done, booked], { today: "2026-11-10" }).filter((r) => r.kind === "재진")).toHaveLength(0);
  });

  it("복약 알림은 처방 일수 안에서만 D-n으로 나오고, 끝나면 사라진다", () => {
    const done = v({
      id: "a",
      date: "2026-11-01",
      prescriptions: [{ drug: "아세트아미노펜 500mg", dose: "1정 3회/일", days: 3 }],
    });
    const on = buildReminders([done], { today: "2026-11-02" }).filter((r) => r.kind === "복약");
    expect(on).toHaveLength(1);
    expect(on[0]).toMatchObject({ drug: "아세트아미노펜 500mg", dose: "1정 3회/일", endDate: "2026-11-03", daysLeft: 1 });
    expect(buildReminders([done], { today: "2026-11-04" }).filter((r) => r.kind === "복약")).toHaveLength(0);
  });

  it("진료 전(예약) 방문의 처방·재진은 세지 않고, 날짜 순으로 정렬한다", () => {
    const booked = v({ id: "x", status: "예약", prescriptions: [{ drug: "A", dose: "1", days: 30 }], followUp: { afterDays: 3 } });
    const a = v({ id: "a", date: "2026-11-01", followUp: { afterDays: 20 } });
    const b = v({ id: "b", date: "2026-11-05", prescriptions: [{ drug: "B", dose: "1", days: 10 }] });
    const rs = buildReminders([booked, a, b], { today: "2026-11-06" });
    expect(rs.map((r) => r.kind)).toEqual(["복약", "재진"]);
  });

  it("지난 재진 권고는 '지남'으로 남는다(예약이 없으면)", () => {
    const done = v({ id: "a", date: "2026-10-01", followUp: { afterDays: 7 } });
    const rs = buildReminders([done], { today: "2026-11-10" });
    expect(rs[0].daysLeft).toBeLessThan(0);
  });
});
