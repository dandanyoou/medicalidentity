/**
 * 토스페이먼츠 결제 연동.
 *
 * 실키(클라이언트 키)는 환경변수 VITE_TOSS_CLIENT_KEY로 받는다. 키가 없으면
 * 결제창을 띄우지 않고 "연동 설정 안내"를 보여준다 — 가짜 결제는 만들지 않는다.
 * 키가 있으면 실제 토스 결제창이 뜨고, 결제 후 successUrl로 돌아와 서버리스
 * 함수(/api/confirm)에서 승인한다.
 *
 * 프로덕션 자동결제(월 구독)는 빌링키 발급(requestBillingAuth)으로 바꾼다 —
 * 여기서는 연동 검증용으로 단건 결제(requestPayment)를 사용한다.
 */
// vite/client 타입을 참조하지 않아도 되게 안전하게 읽는다.
const CLIENT_KEY = (
  import.meta as unknown as { env?: Record<string, string | undefined> }
).env?.VITE_TOSS_CLIENT_KEY;

export class PaymentNotConfiguredError extends Error {
  constructor() {
    super("결제 연동 키(VITE_TOSS_CLIENT_KEY)가 설정되지 않았습니다.");
    this.name = "PaymentNotConfiguredError";
  }
}

/**
 * 이 기기에서 연 결제창의 주문 — 결제 후 successUrl로 돌아왔을 때 "내가 시작한
 * 주문인지"를 대조한다. 위조·재사용된 성공 URL로는 승인 요청을 보내지 않는다.
 */
export interface PendingOrder {
  orderId: string;
  amount: number;
}
const PENDING_KEY = "medid.pendingOrder.v1";

export function savePendingOrder(order: PendingOrder): void {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(order));
  } catch {
    /* no-op */
  }
}

export function readPendingOrder(): PendingOrder | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    return typeof o?.orderId === "string" && typeof o?.amount === "number" ? o : null;
  } catch {
    return null;
  }
}

export function clearPendingOrder(): void {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* no-op */
  }
}

export function isPaymentConfigured(): boolean {
  return typeof CLIENT_KEY === "string" && CLIENT_KEY.length > 0;
}

export async function startCheckout(opts: {
  amount: number;
  orderName: string;
}): Promise<void> {
  if (!CLIENT_KEY) throw new PaymentNotConfiguredError();

  const { loadTossPayments, ANONYMOUS } = await import(
    "@tosspayments/tosspayments-sdk"
  );
  const toss = await loadTossPayments(CLIENT_KEY);
  const payment = toss.payment({ customerKey: ANONYMOUS });

  const orderId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  savePendingOrder({ orderId, amount: opts.amount });
  await payment.requestPayment({
    method: "CARD",
    amount: { currency: "KRW", value: opts.amount },
    orderId,
    orderName: opts.orderName,
    successUrl: `${window.location.origin}/subscribe?status=success`,
    failUrl: `${window.location.origin}/subscribe?status=fail`,
  });
}
