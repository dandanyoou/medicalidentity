// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Skeleton } from "./Skeleton";

afterEach(() => cleanup());

describe("Skeleton", () => {
  it("스크린리더에 숨겨진 자리표시 블록을 그린다", () => {
    render(<Skeleton className="h-3 w-14" />);
    const el = screen.getByTestId("skeleton");
    expect(el.getAttribute("aria-hidden")).toBe("true");
    expect(el.className).toContain("skeleton");
    expect(el.className).toContain("w-14");
  });
});
