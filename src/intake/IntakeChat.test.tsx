// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { IntakeChat } from "./IntakeChat";

afterEach(() => cleanup());

function pressed(name: string | RegExp) {
  return screen.getByRole("button", { name }).getAttribute("aria-pressed");
}

describe("IntakeChat — 대화로 증상 정리", () => {
  it("적어둔 문장에서 부위를 미리 골라두고, 한 질문씩 답하면 정리된 문장을 넘겨준다", () => {
    const onDone = vi.fn();
    render(<IntakeChat seedText="머리가 아프고 어깨가 왜 뻐근하지" onDone={onDone} />);

    // 부위: 문장에서 찾은 곳이 미리 눌려 있다(환자가 고칠 수 있다).
    expect(pressed("머리")).toBe("true");
    expect(pressed("목·어깨")).toBe("true");
    expect(pressed("다리·발")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "다음" }));

    // 2곳 이상이면 가장 불편한 곳을 한 번 더 묻는다.
    expect(screen.getByText(/가장 불편한 곳은 어디예요/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "머리" }));

    // 부위마다 느낌 — 비유 설명이 버튼에 같이 있다.
    expect(screen.getByText(/머리는 어떤 느낌이에요/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /욱신욱신.*맥박이 뛰듯/ }));
    expect(screen.getByText(/목·어깨는 어떤 느낌이에요/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /뻐근·결림/ }));

    fireEvent.click(screen.getByRole("button", { name: "1~3일 전" }));
    fireEvent.click(screen.getByRole("button", { name: /보통/ }));
    fireEvent.click(screen.getByRole("button", { name: "움직일 때" }));
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    fireEvent.click(screen.getByRole("button", { name: "없음" }));
    fireEvent.click(screen.getByRole("button", { name: "다음" }));

    const summary =
      "1~3일 전부터 머리가 욱신욱신 아프고, 목·어깨가 뻐근하고 결려요. 가장 불편한 곳은 머리예요. 아픈 정도는 10점 중 5점(일상이 불편한 정도)이에요. 움직일 때 더 심해져요. 다른 증상은 없어요.";
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone.mock.calls[0][1]).toBe(summary);
    expect(screen.getByText(summary)).toBeTruthy();

    // 답한 내용이 대화 기록으로 남는다.
    const log = screen.getByRole("log");
    expect(within(log).getByText("욱신욱신")).toBeTruthy();
    expect(within(log).getByText("1~3일 전")).toBeTruthy();
  });

  it("진단이 아니라 증상을 정리해 전달하는 문진임을 밝힌다", () => {
    render(<IntakeChat seedText="" onDone={() => {}} />);
    expect(screen.getByText(/진단이 아니라/)).toBeTruthy();
  });

  it("이전 질문으로 돌아가 답을 바꿀 수 있다", () => {
    render(<IntakeChat seedText="머리가 아파요" onDone={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    fireEvent.click(screen.getByRole("button", { name: /욱신욱신/ }));
    expect(screen.getByText("언제부터 그랬어요?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "이전 질문으로" }));
    expect(screen.getByText(/머리는 어떤 느낌이에요/)).toBeTruthy();
  });

  it("'특별히 없음'을 고르면 다른 선택이 풀린다", () => {
    render(<IntakeChat seedText="배가 아파요" onDone={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    fireEvent.click(screen.getByRole("button", { name: /쥐어짜듯/ }));
    fireEvent.click(screen.getByRole("button", { name: "오늘" }));
    fireEvent.click(screen.getByRole("button", { name: /심함.*일을 못 할/ }));
    fireEvent.click(screen.getByRole("button", { name: "먹고 나서" }));
    expect(pressed("먹고 나서")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "특별히 없음" }));
    expect(pressed("먹고 나서")).toBe("false");
    expect(pressed("특별히 없음")).toBe("true");
  });

  it("부위를 하나도 안 고르면 다음으로 갈 수 없다", () => {
    render(<IntakeChat seedText="" onDone={() => {}} />);
    expect((screen.getByRole("button", { name: "다음" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
