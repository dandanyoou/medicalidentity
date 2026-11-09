// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
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
    // 의사 화면 대기열이 시각 순으로 정렬할 수 있게 예약 시각도 저장한다.
    expect(booked?.time).toBe("15:30");
  });

  it("대화로 증상을 정리하면 정리된 문장이 예약 사유로 저장된다", () => {
    render(
      <MemoryRouter>
        <BookingScreen />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByPlaceholderText(/어디가 아프세요|머리가 아프고/), {
      target: { value: "머리가 아파요" },
    });
    const chat = screen.getByRole("region", { name: "대화로 증상 정리" });
    fireEvent.click(within(chat).getByRole("button", { name: "다음" }));
    fireEvent.click(within(chat).getByRole("button", { name: /욱신욱신/ }));
    fireEvent.click(within(chat).getByRole("button", { name: "오늘" }));
    fireEvent.click(within(chat).getByRole("button", { name: /보통/ }));
    fireEvent.click(within(chat).getByRole("button", { name: "특별히 없음" }));
    fireEvent.click(within(chat).getByRole("button", { name: "다음" }));
    fireEvent.click(within(chat).getByRole("button", { name: "없음" }));
    fireEvent.click(within(chat).getByRole("button", { name: "다음" }));

    const summary =
      "오늘부터 머리가 욱신욱신 아파요. 아픈 정도는 10점 중 5점(일상이 불편한 정도)이에요. 다른 증상은 없어요.";
    // 정리된 문장을 환자가 먼저 본다.
    expect(screen.getByText(summary)).toBeTruthy();
    // 선택한 답으로 다 못 한 말은 직접 덧붙일 수 있다.
    fireEvent.change(screen.getByLabelText("의사에게 더 전하고 싶은 말 (선택)"), {
      target: { value: "약을 먹어도 안 나아요" },
    });

    fireEvent.click(screen.getByRole("button", { name: /가정의학과 예약/ }));
    fireEvent.click(screen.getByRole("button", { name: /서울대학교병원/ }));
    fireEvent.click(screen.getByRole("button", { name: "오늘 15:30" }));
    fireEvent.click(screen.getByRole("button", { name: /예약하기/ }));

    const booked = listVisits("self").find((v) => v.status === "예약");
    expect(booked?.reason).toBe(summary);
    // 의사 화면이 항목별로 보여줄 수 있게 문진 답을 구조화해서 함께 저장한다.
    expect(booked?.intake?.parts).toEqual(["머리"]);
    expect(booked?.intake?.quality).toEqual({ 머리: "욱신" });
    expect(booked?.intake?.severity).toBe(5);
    expect(booked?.intake?.note).toBe("약을 먹어도 안 나아요");
  });

  it("여러 곳이 함께 아프면 가장 불편한 곳을 묻고, 부위 기준 진료과와 그 이유를 보여준다", () => {
    render(
      <MemoryRouter>
        <BookingScreen />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByPlaceholderText(/어디가 아프세요|머리가 아프고/), {
      target: { value: "머리가 아프고 다리도 근데 좀 아프네 그리고 어깨가 왜 뻐근하지" },
    });
    const chat = screen.getByRole("region", { name: "대화로 증상 정리" });
    fireEvent.click(within(chat).getByRole("button", { name: "다음" }));
    fireEvent.click(within(chat).getByRole("button", { name: "머리" }));
    fireEvent.click(within(chat).getByRole("button", { name: /욱신욱신/ }));
    fireEvent.click(within(chat).getByRole("button", { name: /뻐근·결림/ }));
    fireEvent.click(within(chat).getByRole("button", { name: /잘 모르겠어요/ }));
    fireEvent.click(within(chat).getByRole("button", { name: "1~3일 전" }));
    fireEvent.click(within(chat).getByRole("button", { name: /보통/ }));
    fireEvent.click(within(chat).getByRole("button", { name: "특별히 없음" }));
    fireEvent.click(within(chat).getByRole("button", { name: "다음" }));
    fireEvent.click(within(chat).getByRole("button", { name: "없음" }));
    fireEvent.click(within(chat).getByRole("button", { name: "다음" }));

    expect(screen.getByText(/여러 곳이 함께 아파서, 먼저 전체를 보는 가정의학과/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /가정의학과 예약/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /신경과 예약/ })).toBeTruthy();
    // 흔한 조합이라 위험 경고는 없다.
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("위험한 조합(가슴 + 숨이 참)이면 119 안내를 먼저 띄운다", () => {
    render(
      <MemoryRouter>
        <BookingScreen />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByPlaceholderText(/어디가 아프세요|머리가 아프고/), {
      target: { value: "가슴이 아파요" },
    });
    const chat = screen.getByRole("region", { name: "대화로 증상 정리" });
    fireEvent.click(within(chat).getByRole("button", { name: "다음" }));
    fireEvent.click(within(chat).getByRole("button", { name: /쥐어짜듯/ }));
    fireEvent.click(within(chat).getByRole("button", { name: "오늘" }));
    fireEvent.click(within(chat).getByRole("button", { name: /보통/ }));
    fireEvent.click(within(chat).getByRole("button", { name: "특별히 없음" }));
    fireEvent.click(within(chat).getByRole("button", { name: "다음" }));
    fireEvent.click(within(chat).getByRole("button", { name: "숨이 참" }));
    fireEvent.click(within(chat).getByRole("button", { name: "다음" }));

    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("지금 119에 연락하세요")).toBeTruthy();
    expect(within(alert).getByRole("link", { name: /119에 전화/ }).getAttribute("href")).toBe("tel:119");
  });
});
