// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trackMock = vi.fn();
vi.mock("@vercel/analytics/react", () => ({
  track: (...args: unknown[]) => trackMock(...args),
}));

import { getOrCreateVisitorId, trackCheckerEvent } from "./analytics";

describe("getOrCreateVisitorId", () => {
  beforeEach(() => localStorage.clear());

  it("처음 호출 시 UUID를 생성해 localStorage에 저장한다", () => {
    const id = getOrCreateVisitorId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(localStorage.getItem("checker_visitor_id")).toBe(id);
  });

  it("두 번째 호출부터는 같은 UUID를 반환한다", () => {
    const first = getOrCreateVisitorId();
    const second = getOrCreateVisitorId();
    expect(second).toBe(first);
  });
});

describe("trackCheckerEvent", () => {
  beforeEach(() => {
    localStorage.clear();
    trackMock.mockClear();
  });
  afterEach(() => vi.restoreAllMocks());

  it("처음 호출하면 track()을 1회 호출한다", () => {
    trackCheckerEvent("checker_completed");
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith(
      "checker_completed",
      expect.objectContaining({ visitorId: expect.any(String) }),
    );
  });

  it("같은 이벤트를 두 번 호출해도 track()은 1회만 호출된다(세션당 1회 제한, D4)", () => {
    trackCheckerEvent("checker_ics_downloaded");
    trackCheckerEvent("checker_ics_downloaded");
    trackCheckerEvent("checker_ics_downloaded");
    expect(trackMock).toHaveBeenCalledTimes(1);
  });

  it("다른 이벤트는 서로 독립적으로 집계된다", () => {
    trackCheckerEvent("checker_completed");
    trackCheckerEvent("checker_payment_intent_clicked");
    expect(trackMock).toHaveBeenCalledTimes(2);
  });

  it("track()이 던져도 예외가 바깥으로 전파되지 않는다(기능에 영향 없음)", () => {
    trackMock.mockImplementationOnce(() => {
      throw new Error("network blocked");
    });
    expect(() => trackCheckerEvent("checker_completed")).not.toThrow();
  });

  it("localStorage.setItem이 던져도(용량 초과 등) 예외가 전파되지 않는다 — 공유·결제·신청 버튼이 이 함수를 try/catch 없이 직접 호출하므로 중요하다", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });
    expect(() => trackCheckerEvent("checker_shared")).not.toThrow();
    spy.mockRestore();
  });
});
