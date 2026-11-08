import { describe, expect, it } from "vitest";
import { buildICS, slotToTime, slotToDate } from "./ics";

describe("slotToDate (UTC가 아니라 로컬 달력 날짜)", () => {
  // 한국 시간 새벽 1시 — UTC로는 아직 전날이다.
  const now = new Date(2026, 10, 10, 1, 0, 0);
  it("오늘은 로컬 날짜 그대로", () => {
    expect(slotToDate("오늘 15:30", now)).toBe("2026-11-10");
  });
  it("내일·모레는 로컬 날짜에 하루·이틀 더한다", () => {
    expect(slotToDate("내일 10:00", now)).toBe("2026-11-11");
    expect(slotToDate("모레 09:30", now)).toBe("2026-11-12");
  });
  it("월말에는 다음 달로 넘어간다", () => {
    expect(slotToDate("내일 10:00", new Date(2026, 10, 30, 1, 0, 0))).toBe("2026-12-01");
  });
});

describe("buildICS", () => {
  it("예약 정보를 캘린더(.ics) 이벤트로 만든다", () => {
    const ics = buildICS({
      hospital: "서울대학교병원",
      dept: "가정의학과",
      date: "2026-11-09",
      slot: "내일 10:00",
      reason: "머리가 아파요",
    });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:서울대학교병원 가정의학과 진료");
    expect(ics).toContain("DTSTART;TZID=Asia/Seoul:20261109T100000");
    expect(ics).toContain("DESCRIPTION:머리가 아파요");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("슬롯 문자열에서 시각을 꺼내고, 없으면 09:00으로 둔다", () => {
    expect(slotToTime("오늘 15:30")).toBe("1530");
    expect(slotToTime("모레")).toBe("0900");
  });
});
