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

describe("FamilyScreen (가족 관리)", () => {
  it("본인이 기본으로 보인다", () => {
    render(
      <MemoryRouter>
        <FamilyScreen />
      </MemoryRouter>,
    );
    expect(screen.getByText("김단유")).toBeTruthy();
  });

  it("가족을 추가하면 목록에 바로 나타난다", () => {
    render(
      <MemoryRouter>
        <FamilyScreen />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByPlaceholderText(/이름/), {
      target: { value: "김복순" },
    });
    fireEvent.click(screen.getByRole("button", { name: "가족 추가" }));
    expect(screen.getByText("김복순")).toBeTruthy();
  });
});
