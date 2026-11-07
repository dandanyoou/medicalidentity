// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WalletScreen } from "./WalletScreen";

describe("WalletScreen — 응급 모드 토글 진단", () => {
  afterEach(() => cleanup());

  it("응급 모드를 켜면 에러 없이 QR이 뜬다", async () => {
    render(
      <MemoryRouter>
        <WalletScreen />
      </MemoryRouter>,
    );
    const toggle = await screen.findByText("응급 공개 · QR 생성");
    fireEvent.click(toggle);

    // 공개 전 확인 바텀시트 — 무엇이 공개되는지 보여준 뒤에만 QR을 만든다.
    const sheet = screen.getByRole("dialog", { name: "응급 정보를 공개할까요?" });
    expect(sheet).toBeTruthy();
    expect(screen.getByText("공개 안 함")).toBeTruthy();
    expect(screen.queryByAltText("Emergency VP QR")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "공개하고 QR 만들기" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    const img = await screen.findByAltText("Emergency VP QR", {}, { timeout: 3000 });
    expect(img).toBeTruthy();
    expect(screen.queryByText(/QR 인코딩 실패/)).toBeNull();
    expect(screen.queryByText(/VP 생성 실패/)).toBeNull();
  });
});
