// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LockScreenScreen } from "./LockScreenScreen";
import { addMember, resetFamily } from "../family/store";
import type { RenderInput } from "./lockscreen";

beforeEach(() => resetFamily());
afterEach(() => {
  cleanup();
  resetFamily();
});

function renderIt(renderImage = vi.fn(async (_input: RenderInput) => "data:image/png;base64,AAA")) {
  render(
    <MemoryRouter>
      <LockScreenScreen renderImage={renderImage} />
    </MemoryRouter>,
  );
  return renderImage;
}

describe("LockScreenScreen — 폰이 잠겨 있어도 보이는 응급 정보", () => {
  it("본인 프로필에서 1층 항목을 미리 채우고, 고른 항목만 이미지 글줄에 들어간다", async () => {
    addMember({ name: "김복순", relation: "부모", blood: "O", rh: "+", phone: "01012345678" });
    const renderImage = renderIt();

    expect((screen.getByLabelText(/혈액형/) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText(/알레르기/) as HTMLInputElement).checked).toBe(true);
    // 비상연락처는 가족 중 연락처가 있는 첫 사람.
    expect(screen.getByText(/김복순 010-1234-5678/, { selector: "strong" })).toBeTruthy();

    await waitFor(() => expect(renderImage).toHaveBeenCalled());
    const firstCall = renderImage.mock.calls[renderImage.mock.calls.length - 1][0];
    expect(firstCall.lines).toContain("혈액형 A+");
    expect(firstCall.lines.some((l) => l.startsWith("알레르기 페니실린"))).toBe(true);
    expect(firstCall.url).toMatch(/\/e#/);

    fireEvent.click(screen.getByLabelText(/알레르기/));
    await waitFor(() => {
      const last = renderImage.mock.calls[renderImage.mock.calls.length - 1][0];
      expect(last.lines.some((l) => l.startsWith("알레르기"))).toBe(false);
    });
    expect(screen.getByRole("img", { name: "응급 잠금화면 미리보기" })).toBeTruthy();
  });

  it("누구나 읽을 수 있다는 점과 이름·주민번호가 없다는 점을 밝히고, 저장·설정 안내·의료 ID 문구가 있다", async () => {
    renderIt();
    expect(screen.getByText(/폰을 본 누구나 읽을 수 있어요/)).toBeTruthy();
    expect(screen.getByText(/이름·주민등록번호는 들어가지 않아요/)).toBeTruthy();
    await screen.findByRole("link", { name: /이미지 저장/ });
    expect(screen.getByText(/잠금화면으로 설정하는 법/)).toBeTruthy();
    expect(screen.getByText(/설정 → 배경화면/)).toBeTruthy(); // iOS
    expect((screen.getByLabelText("의료 ID 문구") as HTMLTextAreaElement).value).toMatch(/혈액형 A\+/);
  });

  it("아무것도 안 고르면 이미지를 만들지 않고 안내한다", async () => {
    const renderImage = renderIt();
    await waitFor(() => expect(renderImage).toHaveBeenCalled());
    const before = renderImage.mock.calls.length;
    fireEvent.click(screen.getByLabelText(/혈액형/));
    fireEvent.click(screen.getByLabelText(/알레르기/));
    expect(screen.getByText(/적어도 한 항목을 골라 주세요/)).toBeTruthy();
    expect(renderImage.mock.calls.length).toBe(before);
  });
});
