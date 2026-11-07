import { describe, expect, it } from "vitest";
import { buildICS, slotToTime } from "./ics";

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
