import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/**
 * 진료비 수납 — 시연(데모) 화면.
 *
 * 중요: 실제 결제·병원 수납 시스템과 연동되어 있지 않다. 결제 연동(PG·병원
 * 수납 시스템)은 별도 계약·보안 심사가 선결이며, 지금은 "이런 흐름이 된다"를
 * 보여주는 시연일 뿐이다 — 실제로 돈이 움직이지 않는다.
 */
interface DemoBill {
  id: string;
  hospital: string;
  date: string;
  dept: string;
  amount: number;
}

const DEMO_BILLS: DemoBill[] = [
  { id: "b1", hospital: "서울대학교병원", date: "2026-11-05", dept: "내과", amount: 38400 },
  { id: "b2", hospital: "분당서울대병원", date: "2026-10-28", dept: "정형외과", amount: 52100 },
];

function won(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}

export function BillingScreen() {
  useEffect(() => {
    document.title = "진료비 수납 (시연) — 가족 의료지갑";
  }, []);

  const [paidId, setPaidId] = useState<string | null>(null);
  const paid = DEMO_BILLS.find((b) => b.id === paidId) ?? null;

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
            진료비 수납
          </h1>
          <span className="ml-1 rounded-full bg-[var(--ink)] px-2 py-0.5 font-data text-[10px] font-bold text-white">
            시연
          </span>
        </header>

        <main className="flex-1 overflow-y-auto px-5 pb-10 pt-5">
          <p className="mb-5 rounded-2xl border-l-4 border-[var(--ink)] bg-[var(--surface)] px-4 py-3 text-xs leading-relaxed text-[var(--ink-2)]">
            <strong className="text-[var(--ink)]">실제 결제가 아닙니다.</strong> 병원 수납
            시스템·결제(PG) 연동 전까지는 돈이 실제로 움직이지 않는 시연 화면입니다.
          </p>

          {paid ? (
            <section className="animate-reveal-in rounded-[28px] bg-[var(--surface)] p-6 text-center shadow-[0_2px_24px_rgba(11,59,60,0.09)]">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--refund)]/12 text-2xl">
                ✓
              </div>
              <p className="text-lg font-extrabold text-[var(--ink)]">납부 완료 (시연)</p>
              <p className="mt-2 font-data text-sm text-[var(--ink-2)]">
                {paid.hospital} · {paid.dept}
              </p>
              <p className="font-data text-2xl font-bold text-[var(--ink)]">
                {won(paid.amount)}
              </p>
              <p className="mt-3 text-[11px] leading-relaxed text-[var(--ink-2)]">
                실제 서비스에서는 병원 수납 시스템에 납부 처리되고 영수증이 발급됩니다.
              </p>
              <button
                type="button"
                onClick={() => setPaidId(null)}
                className="mt-4 w-full rounded-2xl border border-[var(--mist)] py-3 text-sm font-bold text-[var(--ink-2)] active:bg-[var(--paper)]"
              >
                목록으로
              </button>
            </section>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="px-1 font-data text-[10px] uppercase tracking-[0.2em] text-[var(--ink-2)]">
                미납 진료비
              </p>
              {DEMO_BILLS.map((b) => (
                <div
                  key={b.id}
                  className="relative overflow-hidden rounded-3xl bg-[var(--surface)] p-5 shadow-[0_1px_12px_rgba(11,59,60,0.07)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[var(--ink)]">{b.hospital}</p>
                      <p className="font-data text-[11px] text-[var(--ink-2)]">
                        {b.date} · {b.dept}
                      </p>
                    </div>
                    <p className="font-data text-xl font-bold text-[var(--ink)]">
                      {won(b.amount)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPaidId(b.id)}
                    className="mt-4 w-full rounded-2xl bg-[var(--ink)] py-3 text-sm font-bold text-white active:brightness-110"
                  >
                    납부하기 (시연)
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
