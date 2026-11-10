import { describe, expect, it } from "vitest";
import type { Visit } from "../visits/store";
import { historyLine, pastVisits } from "./history";

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

describe("과거 진료 이력 — 같은 환자의 지난 방문(R6)", () => {
  const current = v({ id: "now", date: "2026-11-11", status: "예약" });

  it("같은 환자의 진료를 마친 지난 방문만, 최근 순으로, 현재 방문은 빼고 돌려준다", () => {
    const all = [
      current,
      v({ id: "a", date: "2026-10-01", opinion: "A" }),
      v({ id: "b", date: "2026-11-01", opinion: "B", status: "수납대기" }),
      v({ id: "booked", date: "2026-11-05", status: "예약" }), // 진료 전 → 제외
      v({ id: "future", date: "2026-12-01", opinion: "F" }), // 현재 방문보다 뒤 → 제외
      v({ id: "other", memberId: "mom", opinion: "다른 사람" }),
    ];
    expect(pastVisits(all, current).map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("회원이 아닌 환자(이름으로 구분)는 memberId가 같아도 이름이 다르면 다른 사람이다", () => {
    const cur = v({ id: "now", memberId: "demo", patientName: "박영희", date: "2026-11-11", status: "예약" });
    const all = [
      cur,
      v({ id: "p1", memberId: "demo", patientName: "박영희", date: "2026-10-20", opinion: "같은 사람" }),
      v({ id: "p2", memberId: "demo", patientName: "이준호", date: "2026-10-21", opinion: "다른 사람" }),
    ];
    expect(pastVisits(all, cur).map((x) => x.id)).toEqual(["p1"]);
  });

  it("최대 개수를 지킨다", () => {
    const all = [current, ...Array.from({ length: 8 }, (_, i) => v({ id: `h${i}`, date: `2026-10-${String(i + 1).padStart(2, "0")}` }))];
    expect(pastVisits(all, current, 3)).toHaveLength(3);
  });

  it("한 줄 요약: 날짜·진료과·소견 앞부분·처방 약 이름 — 해석을 더하지 않는다", () => {
    const line = historyLine(
      v({
        id: "x",
        date: "2026-10-01",
        dept: "신경과",
        opinion: "긴장성 두통 의심 소견. 휴식 권고, 2주 내 호전 없으면 재내원.",
        prescriptions: [
          { drug: "아세트아미노펜 500mg", dose: "1정 3회/일", days: 3 },
          { drug: "이부프로펜 200mg", dose: "1정 2회/일", days: 3 },
        ],
      }),
    );
    expect(line.date).toBe("2026-10-01");
    expect(line.dept).toBe("신경과");
    expect(line.opinion).toMatch(/^긴장성 두통 의심 소견/);
    expect(line.drugs).toEqual(["아세트아미노펜 500mg", "이부프로펜 200mg"]);
  });

  it("소견·처방이 없는 방문은 빈 값으로 나타낸다", () => {
    const line = historyLine(v({ id: "y" }));
    expect(line.opinion).toBe("");
    expect(line.drugs).toEqual([]);
  });
});
