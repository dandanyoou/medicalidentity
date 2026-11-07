// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getSettings, setSetting, resetSettings } from "./store";

beforeEach(() => resetSettings());
afterEach(() => resetSettings());

describe("settings store", () => {
  it("기본값: 미납·예약 알림 켜짐, 환급 자동 재확인 꺼짐", () => {
    const s = getSettings();
    expect(s.unpaidAlert).toBe(true);
    expect(s.bookingReminder).toBe(true);
    expect(s.refundAutoCheck).toBe(false);
  });

  it("설정을 바꾸면 저장되고 다시 읽힌다", () => {
    setSetting("unpaidAlert", false);
    expect(getSettings().unpaidAlert).toBe(false);
    setSetting("refundAutoCheck", true);
    expect(getSettings().refundAutoCheck).toBe(true);
  });
});
