// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BookingScreen } from "./BookingScreen";
import { resetVisits, listVisits } from "../visits/store";

beforeEach(() => resetVisits());
afterEach(() => {
  cleanup();
  resetVisits();
});

describe("BookingScreen (예약 · 증상→병원 파이프라인)", () => {
  it("실제 병원 연동이 아닌 '시연'임을 명확히 고지한다", () => {
    render(
      <MemoryRouter>
        <BookingScreen />
      </MemoryRouter>,
    );
    expect(screen.getAllByText(/시연/).length).toBeGreaterThan(0);
    expect(screen.getByText(/실제 병원 연동이 아닙니다/)).toBeTruthy();
  });

  it("증상 정보에서 ?q=로 넘어오면 문장이 채워진 채 추천 진료과가 바로 뜬다", () => {
    render(
      <MemoryRouter initialEntries={["/booking?q=머리가 아파요"]}>
        <BookingScreen />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /가정의학과 예약/ })).toBeTruthy();
  });

  it("증상을 쓰면 추천 진료과가 뜨고, 병원·시간을 골라 예약하면 진료기록이 생긴다", () => {
    render(
      <MemoryRouter>
        <BookingScreen />
      </MemoryRouter>,
    );
    // 증상 입력 → 추천 진료과(두통 → 가정의학과)
    fireEvent.change(screen.getByPlaceholderText(/어디가 아프세요|머리가 아프고/), {
      target: { value: "머리가 아파요" },
    });
    fireEvent.click(screen.getByRole("button", { name: /가정의학과 예약/ }));

    // 병원 선택
    fireEvent.click(screen.getByRole("button", { name: /서울대학교병원/ }));

    // 시간 선택 + 예약
    fireEvent.click(screen.getByRole("button", { name: "오늘 15:30" }));
    fireEvent.click(screen.getByRole("button", { name: /예약하기/ }));

    expect(screen.getByText(/예약 완료/)).toBeTruthy();
    // 완료 카드: 예약→방문→수납 타임라인과 캘린더 추가 CTA
    expect(screen.getByText("방문")).toBeTruthy();
    expect(screen.getByRole("button", { name: /캘린더에 추가/ })).toBeTruthy();
    // 진료기록(Visit)으로 저장됐는지
    const booked = listVisits("self").find((v) => v.status === "예약");
    expect(booked?.hospital).toBe("서울대학교병원");
    expect(booked?.dept).toBe("가정의학과");
    expect(booked?.reason).toBe("머리가 아파요");
  });
});
