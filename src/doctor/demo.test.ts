// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEMO_ID_PREFIX, clearDemoPatients, hasDemoPatients, seedDemoPatients } from "./demo";
import { listVisits, resetVisits } from "../visits/store";
import { localDateKey, todayQueue } from "./queue";
import { checkRedFlags } from "../intake/triage";

const now = new Date(2026, 10, 9, 8, 0);

beforeEach(() => resetVisits());
afterEach(() => resetVisits());

describe("시연 환자 — 병원에서 의사 화면만 열어도 대기열이 차 있게", () => {
  it("오늘 날짜 예약 4명을 문진 기록·환자 이름과 함께 넣는다", () => {
    seedDemoPatients(now);
    const q = todayQueue(listVisits(), now);
    expect(q).toHaveLength(4);
    for (const v of q) {
      expect(v.id.startsWith(DEMO_ID_PREFIX)).toBe(true);
      expect(v.date).toBe(localDateKey(now));
      expect(v.time).toMatch(/^\d{2}:\d{2}$/);
      expect(v.patientName).toBeTruthy();
      expect(v.intake?.summary).toBeTruthy();
      expect(v.reason).toBe(v.intake?.summary);
    }
    // 시각 순으로 정렬돼 들어간다.
    expect(q.map((v) => v.time)).toEqual([...q.map((v) => v.time)].sort());
  });

  it("한 명은 위험 조합이라 의사 카드에 응급 안내가 뜬다(시연에서 보여줄 장면)", () => {
    seedDemoPatients(now);
    const flagged = listVisits().filter((v) => v.intake && checkRedFlags(v.intake));
    expect(flagged).toHaveLength(1);
  });

  it("두 번 불러도 중복되지 않는다", () => {
    seedDemoPatients(now);
    seedDemoPatients(now);
    expect(listVisits().filter((v) => v.id.startsWith(DEMO_ID_PREFIX))).toHaveLength(4);
    expect(hasDemoPatients()).toBe(true);
  });

  it("지우면 시연 환자만 사라지고 다른 기록은 남는다", () => {
    const before = listVisits().length; // 시드 진료기록 3건
    seedDemoPatients(now);
    clearDemoPatients();
    expect(hasDemoPatients()).toBe(false);
    expect(listVisits()).toHaveLength(before);
  });
});
