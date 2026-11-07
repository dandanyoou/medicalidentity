// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BottomSheet } from "./BottomSheet";

afterEach(() => cleanup());

describe("BottomSheet", () => {
  it("열리면 dialog로 렌더되고 제목이 보인다", () => {
    render(
      <BottomSheet open title="응급 정보를 공개할까요?" onClose={() => {}}>
        <p>본문</p>
      </BottomSheet>,
    );
    const dialog = screen.getByRole("dialog", { name: "응급 정보를 공개할까요?" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByText("본문")).toBeTruthy();
  });

  it("닫혀 있으면 아무것도 렌더하지 않는다", () => {
    render(
      <BottomSheet open={false} title="숨김" onClose={() => {}}>
        <p>본문</p>
      </BottomSheet>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("배경을 누르거나 Escape를 누르면 onClose가 불린다", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open title="닫기 테스트" onClose={onClose}>
        <p>본문</p>
      </BottomSheet>,
    );
    fireEvent.click(screen.getByTestId("sheet-backdrop"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
