// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { listTrialRequests, PLAN, saveTrialRequest, TRIAL_KEY } from "./trial";

beforeEach(() => localStorage.clear());

describe("병원 체험 신청(시연 저장)", () => {
  it("요금안은 '안(가정)'이고 14일 무료 체험이 붙어 있다", () => {
    expect(PLAN.assumed).toBe(true);
    expect(PLAN.trialDays).toBe(14);
    expect(PLAN.monthlyWon).toBeGreaterThan(0);
  });

  it("병원명·담당자·연락처를 기기 저장소(medid.*)에 저장하고 목록으로 읽는다", () => {
    const r = saveTrialRequest({ hospital: "행복의원", contact: "김원장", phone: "02-123-4567" });
    expect(r.id).toBeTruthy();
    expect(r.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(TRIAL_KEY.startsWith("medid.")).toBe(true);
    expect(listTrialRequests()).toHaveLength(1);
    expect(listTrialRequests()[0].hospital).toBe("행복의원");
  });

  it("빈 병원명·연락처는 저장하지 않는다", () => {
    expect(() => saveTrialRequest({ hospital: "  ", contact: "김원장", phone: "" })).toThrow();
    expect(listTrialRequests()).toHaveLength(0);
  });

  it("깨진 저장값은 빈 목록으로 읽는다", () => {
    localStorage.setItem(TRIAL_KEY, "{not json");
    expect(listTrialRequests()).toEqual([]);
  });
});
