import { describe, it, expect } from "vitest";
import { localDateKey, todayQueue } from "./queue";
import type { Visit } from "../visits/store";

function visit(over: Partial<Visit>): Visit {
  return {
    id: over.id ?? Math.random().toString(36).slice(2),
    memberId: "self",
    hospital: "서울대학교병원",
    dept: "가정의학과",
    date: "2026-11-09",
    reason: "머리가 아파요",
    amount: 0,
    paid: false,
    status: "예약",
    ...over,
  };
}

describe("localDateKey", () => {
  it("로컬 날짜를 YYYY-MM-DD로 0을 채워 만든다", () => {
    expect(localDateKey(new Date(2026, 0, 5, 1, 0))).toBe("2026-01-05");
  });
});

describe("todayQueue — 오늘 진료 대기열", () => {
  const now = new Date(2026, 10, 9, 8, 30); // 2026-11-09 08:30 (로컬)

  it("오늘 날짜의 '예약' 방문만 담는다", () => {
    const q = todayQueue(
      [
        visit({ id: "a" }),
        visit({ id: "past", date: "2026-11-08" }),
        visit({ id: "future", date: "2026-11-10" }),
        visit({ id: "billing", status: "수납대기", amount: 1000 }),
        visit({ id: "done", status: "완료", paid: true }),
      ],
      now,
    );
    expect(q.map((v) => v.id)).toEqual(["a"]);
  });

  it("예약 시각 순으로 정렬하고, 시각이 없는 예약은 맨 뒤에 둔다", () => {
    const q = todayQueue(
      [
        visit({ id: "none" }),
        visit({ id: "late", time: "15:30" }),
        visit({ id: "early", time: "09:30" }),
      ],
      now,
    );
    expect(q.map((v) => v.id)).toEqual(["early", "late", "none"]);
  });
});
