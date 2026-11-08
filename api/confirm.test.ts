import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "./confirm";

function mockRes() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r: any = {};
  r.status = vi.fn(() => r);
  r.json = vi.fn(() => r);
  return r;
}

const VALID = { paymentKey: "pk_test_123", orderId: "sub_1731000000000_abcd1234", amount: 3900 };

beforeEach(() => {
  process.env.TOSS_SECRET_KEY = "test_sk";
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.TOSS_SECRET_KEY;
});

describe("api/confirm (토스 결제 승인)", () => {
  it("POST가 아니면 405", async () => {
    const res = mockRes();
    await handler({ method: "GET" }, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it("시크릿 키가 없으면 503", async () => {
    delete process.env.TOSS_SECRET_KEY;
    const res = mockRes();
    await handler({ method: "POST", body: VALID }, res);
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it("필드가 빠지면 400", async () => {
    const res = mockRes();
    await handler({ method: "POST", body: { paymentKey: "pk" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("플랜 가격(3,900원)과 다른 금액은 토스에 보내기 전에 400으로 막는다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = mockRes();
    await handler({ method: "POST", body: { ...VALID, amount: 100 } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("숫자가 아닌 금액도 막는다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = mockRes();
    await handler({ method: "POST", body: { ...VALID, amount: "abc" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("주문번호 형식이 우리 것이 아니거나 paymentKey가 문자열이 아니면 400", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const r1 = mockRes();
    await handler({ method: "POST", body: { ...VALID, orderId: "x" } }, r1);
    expect(r1.status).toHaveBeenCalledWith(400);
    const r2 = mockRes();
    await handler({ method: "POST", body: { ...VALID, paymentKey: { a: 1 } } }, r2);
    expect(r2.status).toHaveBeenCalledWith(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("검증을 통과하면 토스에 그대로 승인을 요청하고 결과를 돌려준다", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: "DONE", orderId: VALID.orderId, totalAmount: 3900 }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const res = mockRes();
    await handler({ method: "POST", body: VALID }, res);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(body).toEqual(VALID);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("토스 호출이 실패하면 502", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("net"); }));
    const res = mockRes();
    await handler({ method: "POST", body: VALID }, res);
    expect(res.status).toHaveBeenCalledWith(502);
  });
});
