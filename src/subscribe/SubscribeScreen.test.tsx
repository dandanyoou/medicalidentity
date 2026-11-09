// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SubscribeScreen } from "./SubscribeScreen";
import { clearPremium, isPremium, setPremium } from "./plan";
import { savePendingOrder, clearPendingOrder } from "./payment";

const ORDER = "sub_1731000000000_abcd1234";
const SUCCESS = `/subscribe?status=success&paymentKey=pk_test&orderId=${ORDER}&amount=3900`;

function renderAt(url = "/subscribe") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <SubscribeScreen />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  clearPremium();
  clearPendingOrder();
});
afterEach(() => {
  cleanup();
  clearPremium();
  clearPendingOrder();
  vi.unstubAllGlobals();
});

describe("SubscribeScreen (가족 프리미엄)", () => {
  it("플랜·가격·혜택을 보여준다", () => {
    renderAt();
    expect(screen.getAllByText(/가족 프리미엄/).length).toBeGreaterThan(0);
    expect(screen.getByText(/3,900원/)).toBeTruthy();
    expect(screen.getByText(/가족 구성원 무제한 등록/)).toBeTruthy();
  });

  it("해지·환불(청약철회 7일)·자동결제 없음을 결제 전에 알리고 약관으로 연결한다", () => {
    renderAt();
    const notice = screen.getByRole("region", { name: "해지·환불 안내" });
    expect(within(notice).getByText(/7일 이내/)).toBeTruthy();
    expect(within(notice).getByText(/자동으로 결제되지 않/)).toBeTruthy();
    expect(within(notice).getByRole("link", { name: /이용약관/ }).getAttribute("href")).toBe("/terms");
  });

  it("결제 키가 없으면 가짜 결제 대신 연동 설정 안내를 보여준다", () => {
    renderAt();
    expect(screen.getByText(/결제 연동 준비됨/)).toBeTruthy();
    expect(screen.getByText(/VITE_TOSS_CLIENT_KEY/)).toBeTruthy();
  });
});

describe("SubscribeScreen — 결제 승인 복귀", () => {
  it("이 기기에서 시작한 주문이고 토스가 DONE으로 승인하면 프리미엄이 켜진다", async () => {
    savePendingOrder({ orderId: ORDER, amount: 3900 });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ status: "DONE", orderId: ORDER, totalAmount: 3900 }),
      })),
    );
    renderAt(SUCCESS);
    expect(await screen.findByText("가족 프리미엄 이용 중")).toBeTruthy();
    expect(isPremium()).toBe(true);
  });

  it("응답이 200이어도 승인 내용(DONE·주문번호)이 맞지 않으면 프리미엄을 켜지 않는다", async () => {
    savePendingOrder({ orderId: ORDER, amount: 3900 });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ status: "READY" }) })));
    renderAt(SUCCESS);
    expect(await screen.findByText(/승인 결과를 확인하지 못했어요/)).toBeTruthy();
    expect(isPremium()).toBe(false);
  });

  it("이 기기에서 시작하지 않은 주문이면 승인 요청 자체를 보내지 않는다", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    renderAt(SUCCESS);
    expect(await screen.findByText(/이 기기에서 시작한 결제가 아니에요/)).toBeTruthy();
    expect(f).not.toHaveBeenCalled();
    expect(isPremium()).toBe(false);
  });

  it("이미 프리미엄이면 성공 URL로 다시 와도 승인 요청을 보내지 않는다", () => {
    setPremium(true);
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    renderAt(SUCCESS);
    expect(f).not.toHaveBeenCalled();
    expect(screen.getByText("가족 프리미엄 이용 중")).toBeTruthy();
  });

  it("결제 실패로 돌아오면 토스가 준 사유를 보여준다", () => {
    renderAt(`/subscribe?status=fail&code=PAY_PROCESS_CANCELED&message=${encodeURIComponent("사용자가 결제를 취소했어요")}`);
    expect(screen.getByText(/사용자가 결제를 취소했어요/)).toBeTruthy();
    expect(isPremium()).toBe(false);
  });
});
