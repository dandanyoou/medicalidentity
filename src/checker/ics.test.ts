// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildIcsEvent, escapeIcsText, formatIcsDate, triggerIcsDownload } from "./ics";

describe("formatIcsDate", () => {
  it("YYYYMMDD 형식으로 날짜만 인코딩한다", () => {
    expect(formatIcsDate(new Date(2030, 7, 1))).toBe("20300801");
  });

  it("한 자리 월/일은 0으로 채운다", () => {
    expect(formatIcsDate(new Date(2030, 0, 5))).toBe("20300105");
  });
});

describe("escapeIcsText", () => {
  it("쉼표, 세미콜론, 백슬래시, 줄바꿈을 이스케이프한다", () => {
    expect(escapeIcsText("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
  });
});

describe("buildIcsEvent", () => {
  it("정상 날짜로 VEVENT 문자열을 생성한다", () => {
    const ics = buildIcsEvent({ summary: "환급 신청 기한", date: new Date(2030, 7, 1) });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("DTSTART;VALUE=DATE:20300801");
    expect(ics).toContain("SUMMARY:환급 신청 기한");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("줄바꿈이 CRLF다(RFC5545 요구사항)", () => {
    const ics = buildIcsEvent({ summary: "s", date: new Date(2030, 0, 1) });
    expect(ics).toContain("\r\n");
    expect(ics.includes("\n") && !ics.includes("\r\n")).toBe(false);
  });

  it("description이 있으면 포함한다", () => {
    const ics = buildIcsEvent({ summary: "s", description: "d", date: new Date(2030, 0, 1) });
    expect(ics).toContain("DESCRIPTION:d");
  });

  it("description이 없으면 DESCRIPTION 라인을 넣지 않는다", () => {
    const ics = buildIcsEvent({ summary: "s", date: new Date(2030, 0, 1) });
    expect(ics).not.toContain("DESCRIPTION:");
  });
});

describe("triggerIcsDownload", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("data: URI 다운로드 트리거: anchor를 만들어 클릭하고 나중에 revoke한다", () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    triggerIcsDownload("deadline.ics", "BEGIN:VCALENDAR\r\nEND:VCALENDAR");

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});
