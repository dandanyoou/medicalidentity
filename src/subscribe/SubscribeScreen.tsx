import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FAMILY_PREMIUM, isPremium, setPremium } from "./plan";
import { isPaymentConfigured, startCheckout, PaymentNotConfiguredError } from "./payment";

function won(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}

type Confirm = "idle" | "confirming" | "ok" | "error";

/**
 * 가족 프리미엄 구독 화면.
 *
 * - 토스 키가 설정돼 있으면 '구독하기' → 실제 토스 결제창 → successUrl 복귀 →
 *   서버리스(/api/confirm)에서 승인 → 프리미엄 활성화.
 * - 키가 없으면(기본) 가짜 결제 대신 '연동 설정 안내'를 보여준다.
 */
export function SubscribeScreen() {
  useEffect(() => {
    document.title = "가족 프리미엄 — 가족 의료지갑";
  }, []);

  const [params] = useSearchParams();
  const status = params.get("status");
  const [premium, setPremiumState] = useState(isPremium());
  const [confirm, setConfirm] = useState<Confirm>("idle");
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // 결제 후 successUrl로 돌아오면 서버에서 승인한다.
  useEffect(() => {
    if (status !== "success") return;
    const paymentKey = params.get("paymentKey");
    const orderId = params.get("orderId");
    const amount = params.get("amount");
    if (!paymentKey || !orderId || !amount) return;

    setConfirm("confirming");
    fetch("/api/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
    })
      .then(async (res) => {
        if (res.ok) {
          setPremium(true);
          setPremiumState(true);
          setConfirm("ok");
        } else {
          const body = await res.json().catch(() => ({}));
          setConfirm("error");
          setConfirmMsg(
            body?.message ??
              "결제 승인 서버(/api/confirm)가 아직 설정되지 않았습니다. Vercel에 TOSS_SECRET_KEY를 넣고 재배포하면 승인됩니다.",
          );
        }
      })
      .catch(() => {
        setConfirm("error");
        setConfirmMsg(
          "승인 요청에 실패했습니다. 결제 승인 서버리스 함수(/api/confirm)가 배포돼 있어야 합니다.",
        );
      });
  }, [status, params]);

  async function handleSubscribe() {
    setCheckoutError(null);
    try {
      await startCheckout({
        amount: FAMILY_PREMIUM.priceMonthly,
        orderName: `${FAMILY_PREMIUM.name} 월 구독`,
      });
    } catch (e) {
      if (e instanceof PaymentNotConfiguredError) return; // 아래 설정 안내가 뜸
      setCheckoutError((e as Error)?.message ?? "결제창을 여는 데 실패했습니다.");
    }
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] md:px-6 md:py-10">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-[var(--paper)] md:max-w-xl md:min-h-0 md:overflow-hidden md:rounded-[32px] md:shadow-[0_8px_60px_rgba(11,59,60,0.14)]">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--mist)] bg-[var(--paper)]/92 px-5 py-4 backdrop-blur">
          <Link
            to="/wallet"
            aria-label="지갑으로 돌아가기"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink-2)] hover:bg-[var(--surface)]"
          >
            ‹
          </Link>
          <h1 className="text-base font-extrabold tracking-tight text-[var(--ink)]">
            가족 프리미엄
          </h1>
        </header>

        <main className="flex-1 overflow-y-auto px-5 pb-10 pt-5">
          {premium || confirm === "ok" ? (
            <section className="rounded-[28px] bg-[var(--surface)] p-6 text-center shadow-[0_2px_24px_rgba(11,59,60,0.09)]">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--refund)]/12 text-2xl">
                ✓
              </div>
              <p className="text-lg font-extrabold text-[var(--ink)]">가족 프리미엄 이용 중</p>
              <p className="mt-2 text-sm text-[var(--ink-2)]">
                가족 무제한 · 환급 자동 재확인 · 진료기록 무제한 백업이 켜졌어요.
              </p>
              <Link
                to="/family"
                className="mt-4 block w-full rounded-2xl bg-[var(--ink)] py-3 text-sm font-bold text-white active:brightness-110"
              >
                가족 추가하러 가기
              </Link>
            </section>
          ) : (
            <>
              {/* 가치 */}
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--refund-ink)]">
                환급은 늘 무료 · 관리에만 과금
              </p>
              <h2 className="mb-1 text-2xl font-extrabold tracking-tight text-[var(--ink)]">
                가족 의료를 한 번에
              </h2>
              <p className="mb-5 text-sm leading-relaxed text-[var(--ink-2)]">
                환급금엔 수수료 0원 그대로. 멀리 사는 부모님까지 가족 모두의 의료를
                자녀가 한 계정에서 챙기는 편의에만 과금합니다.
              </p>

              <section className="relative overflow-hidden rounded-[28px] bg-[var(--surface)] p-6 shadow-[0_2px_24px_rgba(11,59,60,0.09)]">
                <div className="absolute inset-x-0 top-0 h-1.5 bg-[var(--refund)]" />
                <div className="flex items-end justify-between">
                  <span className="text-sm font-extrabold text-[var(--ink)]">
                    {FAMILY_PREMIUM.name}
                  </span>
                  <span>
                    <span className="font-data text-3xl font-bold text-[var(--ink)]">
                      {won(FAMILY_PREMIUM.priceMonthly)}
                    </span>
                    <span className="text-sm font-medium text-[var(--ink-2)]"> /월</span>
                  </span>
                </div>
                <ul className="mt-4 flex flex-col gap-2">
                  {FAMILY_PREMIUM.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[var(--ink)]">
                      <span className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full bg-[var(--refund)]/15 text-[10px] text-[var(--refund-ink)]">
                        ✓
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                {confirm === "confirming" && (
                  <p className="mt-4 text-sm text-[var(--ink-2)]">결제 승인 중...</p>
                )}
                {confirm === "error" && confirmMsg && (
                  <p className="mt-4 rounded-2xl border-l-4 border-[var(--vital)] bg-[var(--paper)] px-4 py-3 text-xs text-[var(--vital-ink)]">
                    {confirmMsg}
                  </p>
                )}
                {checkoutError && (
                  <p className="mt-4 rounded-2xl border-l-4 border-[var(--vital)] bg-[var(--paper)] px-4 py-3 text-xs text-[var(--vital-ink)]">
                    {checkoutError}
                  </p>
                )}

                {isPaymentConfigured() ? (
                  <button
                    type="button"
                    onClick={handleSubscribe}
                    className="mt-5 w-full rounded-2xl bg-[var(--refund)] py-3.5 text-base font-bold text-white active:brightness-95"
                  >
                    구독하기 · {won(FAMILY_PREMIUM.priceMonthly)}/월
                  </button>
                ) : (
                  <div className="mt-5 rounded-2xl bg-[var(--paper)] p-4">
                    <p className="text-sm font-bold text-[var(--ink)]">결제 연동 준비됨</p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--ink-2)]">
                      실제 결제는 토스페이먼츠 키를 연결하면 바로 켜집니다(가짜 결제는
                      만들지 않았어요). 연결 방법:
                    </p>
                    <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-[var(--ink-2)]">
                      <li>토스페이먼츠 가입 → 클라이언트 키·시크릿 키 발급</li>
                      <li>
                        <code className="font-data">VITE_TOSS_CLIENT_KEY</code>(프론트) ·{" "}
                        <code className="font-data">TOSS_SECRET_KEY</code>(서버)를 Vercel
                        환경변수에 추가
                      </li>
                      <li>재배포 → 이 버튼이 실제 결제창으로 바뀜</li>
                    </ol>
                    <p className="mt-2 text-[11px] text-[var(--ink-2)]">
                      자세한 건 저장소의 <code className="font-data">docs/payments.md</code>.
                    </p>
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
