// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WalletScreen } from "./WalletScreen";
import { listVisits, payVisit, resetVisits } from "../visits/store";
import { addClaim, resetClaims } from "../insurance/store";

describe("WalletScreen — 오늘 챙길 것", () => {
  afterEach(() => {
    cleanup();
    resetVisits();
    resetClaims();
  });

  it("미납·청구·예약이 모두 없으면 '오늘은 급한 게 없어요'를 보여준다", async () => {
    resetVisits();
    resetClaims();
    for (const v of listVisits("self")) {
      payVisit(v.id);
      addClaim(v.id, "삼성화재");
    }
    render(
      <MemoryRouter>
        <WalletScreen />
      </MemoryRouter>,
    );
    expect(await screen.findByText("오늘은 급한 게 없어요")).toBeTruthy();
    expect(screen.queryByText(/미납 진료비/)).toBeNull();
  });
});

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
