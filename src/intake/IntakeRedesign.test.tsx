// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { IntakeChat } from "./IntakeChat";

/**
 * U2 — 문진 리디자인(참고 영상 규칙: 카드 속 카드 · 말풍선 · 원형 아이콘 버튼 44px).
 * 문진 내용·역할 이름은 바꾸지 않는다. 배치·면·버튼 모양만 테스트로 고정한다.
 */
afterEach(() => cleanup());

describe("U2 문진 — 카드 속 카드", () => {
  it("바깥 카드는 surface, 대화 기록과 지금 질문은 paper 면 안쪽 카드다", () => {
    render(<IntakeChat seedText="" onDone={() => {}} />);
    const section = screen.getByRole("region", { name: "대화로 증상 정리" });
    expect(section.className).toMatch(/bg-\[var\(--surface\)\]/);
    const question = screen.getByRole("group", { name: "지금 질문" });
    expect(question.className).toMatch(/bg-\[var\(--paper\)\]/);
    expect(question.className).toMatch(/rounded-2xl/);
  });
});

describe("U2 문진 — 말풍선", () => {
  it("내 답은 잉크색, 질문은 흰 카드 말풍선으로 기록에 남는다", () => {
    render(<IntakeChat seedText="" onDone={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "머리" }));
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    const log = screen.getByRole("log", { name: "문진 대화 기록" });
    expect(log.className).toMatch(/bg-\[var\(--paper\)\]/);
    const me = within(log).getByText("머리");
    expect(me.className).toMatch(/bg-\[var\(--ink\)\]/);
    const bot = within(log).getByText(/어디가 불편/);
    expect(bot.className).toMatch(/bg-\[var\(--surface\)\]/);
  });
});

describe("U2 문진 — 원형 아이콘 버튼", () => {
  it("'이전 질문으로'는 44px 원형 버튼이고 이름은 그대로다", () => {
    render(<IntakeChat seedText="" onDone={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "머리" }));
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    const back = screen.getByRole("button", { name: "이전 질문으로" });
    expect(back.className).toMatch(/rounded-full/);
    expect(back.className).toMatch(/h-11/);
    expect(back.className).toMatch(/w-11/);
  });
});
