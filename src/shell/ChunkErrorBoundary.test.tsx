// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ChunkErrorBoundary, RELOAD_GUARD_KEY } from "./ChunkErrorBoundary";

function Boom({ error }: { error: Error }): never {
  throw error;
}

const chunkError = () =>
  new TypeError("Failed to fetch dynamically imported module: https://x.test/assets/FamilyScreen-abc.js");

beforeEach(() => {
  sessionStorage.clear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe("ChunkErrorBoundary (배포 직후 옛 화면 파일을 못 받을 때)", () => {
  it("화면 파일 로드 실패면 한 번 자동으로 새로고침한다", () => {
    const reload = vi.fn();
    render(
      <ChunkErrorBoundary onReload={reload}>
        <Boom error={chunkError()} />
      </ChunkErrorBoundary>,
    );
    expect(reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(RELOAD_GUARD_KEY)).toBeTruthy();
  });

  it("방금 새로고침했는데 또 실패하면 무한 새로고침 대신 안내 화면을 보여준다", () => {
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
    const reload = vi.fn();
    render(
      <ChunkErrorBoundary onReload={reload}>
        <Boom error={chunkError()} />
      </ChunkErrorBoundary>,
    );
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByText(/화면을 불러오지 못했어요/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("다른 오류는 자동 새로고침 없이 안내 화면을 보여준다", () => {
    const reload = vi.fn();
    render(
      <ChunkErrorBoundary onReload={reload}>
        <Boom error={new Error("boom")} />
      </ChunkErrorBoundary>,
    );
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByText(/화면을 불러오지 못했어요/)).toBeTruthy();
  });

  it("오류가 없으면 자식을 그대로 그린다", () => {
    render(
      <ChunkErrorBoundary onReload={vi.fn()}>
        <p>정상 화면</p>
      </ChunkErrorBoundary>,
    );
    expect(screen.getByText("정상 화면")).toBeTruthy();
  });
});
