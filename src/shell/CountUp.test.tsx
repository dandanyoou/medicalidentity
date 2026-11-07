// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { CountUp } from "./CountUp";

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("prefers-reduced-motion") && reduce,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CountUp", () => {
  it("reduced-motion이면 애니메이션 없이 최종값을 바로 보여준다", () => {
    stubReducedMotion(true);
    render(<CountUp value={9100000} suffix="원" />);
    expect(screen.getByText("9,100,000원")).toBeTruthy();
  });

  it("값이 0이면 0을 보여준다", () => {
    stubReducedMotion(true);
    render(<CountUp value={0} suffix="원" />);
    expect(screen.getByText("0원")).toBeTruthy();
  });
});
