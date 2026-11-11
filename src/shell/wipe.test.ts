// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { wipeLocalData } from "./wipe";

afterEach(() => localStorage.clear());

describe("wipeLocalData — 이 앱이 기기에 남긴 것을 모두 지운다", () => {
  it("medid.* 와 checker_* 키만 지우고 다른 사이트 데이터는 건드리지 않는다", () => {
    localStorage.setItem("medid.visits.v1", "[]");
    localStorage.setItem("medid.consent.v1", "{}");
    localStorage.setItem("checker_visitor_id", "abc");
    localStorage.setItem("checker_fired_checker_completed", "1");
    localStorage.setItem("other_app_key", "keep");
    sessionStorage.setItem("medid.pendingOrder.v1", "{}");

    const removed = wipeLocalData();

    expect(removed).toBe(5);
    expect(localStorage.getItem("medid.visits.v1")).toBeNull();
    expect(localStorage.getItem("checker_visitor_id")).toBeNull();
    expect(sessionStorage.getItem("medid.pendingOrder.v1")).toBeNull();
    expect(localStorage.getItem("other_app_key")).toBe("keep");
  });
});
