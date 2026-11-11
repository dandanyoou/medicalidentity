// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Stepper } from "./Stepper";

afterEach(() => cleanup());

const STEPS = [{ label: "접수" }, { label: "심사중" }, { label: "지급완료" }];

describe("Stepper", () => {
  it("모든 단계를 보여주고 현재 단계에 aria-current를 둔다", () => {
    render(<Stepper steps={STEPS} current={1} />);
    expect(screen.getByText("접수")).toBeTruthy();
    expect(screen.getByText("심사중")).toBeTruthy();
    expect(screen.getByText("지급완료")).toBeTruthy();
    const current = document.querySelector('[aria-current="step"]');
    expect(current?.textContent).toBe("2"); // 현재 단계는 번호, 지난 단계는 ✓
  });

  it("지난 단계는 ✓로 표시한다", () => {
    render(<Stepper steps={STEPS} current={2} />);
    const checks = screen.getAllByText("✓");
    expect(checks.length).toBe(2);
  });
});
