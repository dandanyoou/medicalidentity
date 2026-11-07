// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FamilyScreen } from "./FamilyScreen";
import { resetFamily } from "./store";

beforeEach(() => resetFamily());
afterEach(() => {
  cleanup();
  resetFamily();
});

function renderScreen() {
  return render(
    <MemoryRouter>
      <FamilyScreen />
    </MemoryRouter>,
  );
}

describe("FamilyScreen (가족 관리)", () => {
  it("본인이 기본으로 보이고, 이니셜 아바타와 '본인' 배지가 붙는다", () => {
    renderScreen();
    expect(screen.getByText("김단유")).toBeTruthy();
    expect(screen.getByText("김", { selector: "[aria-hidden]" })).toBeTruthy();
    expect(screen.getByText("본인")).toBeTruthy();
  });

  it("가족이 본인뿐이면 빈 상태 안내가 보인다", () => {
    renderScreen();
    expect(screen.getByText(/아직 등록된 가족이 없어요/)).toBeTruthy();
  });

  it("가족 추가는 바텀시트에서 하고, 추가하면 목록에 바로 나타난다", () => {
    renderScreen();
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "가족 추가" }));
    const sheet = screen.getByRole("dialog", { name: "가족 추가" });
    expect(sheet).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText(/이름/), {
      target: { value: "김복순" },
    });
    fireEvent.click(screen.getByRole("button", { name: "추가하기" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("김복순")).toBeTruthy();
    expect(screen.queryByText(/아직 등록된 가족이 없어요/)).toBeNull();
  });
});
