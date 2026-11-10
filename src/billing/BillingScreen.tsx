import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listVisits, unpaidVisits, payVisit, isUnpaid, type Visit } from "../visits/store";
import { CountUp } from "../shell/CountUp";
import { Stepper } from "../shell/Stepper";
import { BottomSheet } from "../shell/BottomSheet";

// 방문 진행 상태 — 예약 → 방문 → 수납.
const VISIT_STEPS = [{ label: "예약" }, { label: "방문" }, { label: "수납" }];
const VISIT_STEP_INDEX: Record<Visit["status"], number> = { 예약: 0, 수납대기: 1, 완료: 2 };
// 카드 배지 — paid 여부가 아니라 상태로 정한다(예약은 미납이 아니다).
const STATUS_BADGE: Record<Visit["status"], { label: string; cls: string }> = {
  예약: { label: "예약", cls: "bg-[var(--ink)]/8 text-[var(--ink)]" },
  수납대기: { label: "수납대기", cls: "bg-[var(--vital)]/12 text-[var(--vital-ink)]" },
  완료: { label: "수납완료", cls: "bg-[var(--refund)]/12 text-[var(--refund-ink)]" },
};

/**
 * 수납 · 진료기록 — 시연(데모).
 *
 * 단순 "납부하기" 버튼이 아니라, 진료 방문 한 건의 전체를 보여준다:
 * 방문 이유 · 소견서 · 처방전 · 진료비 · 수납 상태. 종이로 받던 진료내역서·
 * 처방전을 온라인으로 대신한다.
 *
 * 이탈 알림(개념): 병원을 나설 때 미납 진료비가 있으면 알려주는 아이디어 —
 * 실제로는 앱 설치·위치권한·병원 수납 연동이 필요해 지금은 개념 시연이다.
 *
 * 정직: 소견서·처방전·금액은 데모 데이터, 결제는 실제로 돈이 움직이지 않는다.
 */
const MEMBER = "self";

function won(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}

export function BillingScreen() {
  useEffect(() => {
    document.title = "수납 · 진료기록 (시연) — 가족 의료지갑";
  }, []);

  const [tick, setTick] = useState(0); // 수납 후 재조회용
  const [openId, setOpenId] = useState<string | null>(null);
  const [geofence, setGeofence] = useState(true);
  // 수납 확인 시트 — 토스 결제창처럼 병원·금액을 한 번 더 보여준 뒤에만 수납한다.
  const [payTarget, setPayTarget] = useState<Visit | null>(null);

  const visits = listVisits(MEMBER);
  const unpaid = unpaidVisits(MEMBER);
  void tick;

  function confirmPay() {
    if (!payTarget) return;
    payVisit(payTarget.id);
    setPayTarget(null);
    setTick((t) => t + 1);
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
            수납 · 진료기록
          </h1>
          <span className="ml-1 rounded-full bg-[var(--ink)] px-2 py-0.5 font-data text-[10px] font-bold text-white">
            시연
          </span>
          <Link
            to="/documents"
            className="ml-auto rounded-full border border-[var(--mist)] bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-[var(--ink)]"
          >
            서류함
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto px-5 pb-10 pt-5">
          <p className="mb-4 rounded-2xl border-l-4 border-[var(--ink)] bg-[var(--surface)] px-4 py-3 text-xs leading-relaxed text-[var(--ink-2)]">
            <strong className="text-[var(--ink)]">실제 결제가 아닙니다.</strong> 소견서·처방전·금액은
            데모이고, 병원 수납·결제(PG) 연동 전까지 돈이 실제로 움직이지 않는 시연입니다.
          </p>

          {/* 이탈 알림(개념·시연) */}
          <div className="mb-5 flex items-start gap-3 rounded-2xl bg-[var(--surface)] px-4 py-3 shadow-[0_1px_12px_rgba(11,59,60,0.07)]">
            <div className="flex-1">
              <p className="text-sm font-bold text-[var(--ink)]">병원 이탈 시 미납 알림</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--ink-2)]">
                병원을 나설 때 미납 진료비가 있으면 알려드려요. (개념·시연 — 실제 위치
                알림은 앱 설치·위치권한·병원 수납 연동이 필요합니다.)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setGeofence((v) => !v)}
              aria-pressed={geofence}
              aria-label="이탈 알림 토글"
              className={`mt-0.5 flex h-6 w-11 flex-none items-center rounded-full p-0.5 transition ${
                geofence ? "bg-[var(--vital)]" : "bg-[var(--mist)]"
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full bg-white shadow transition ${
                  geofence ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {unpaid.length > 0 && (
            <div className="mb-3 flex items-center justify-between rounded-2xl border-l-4 border-[var(--vital)] bg-[var(--surface)] px-4 py-3">
              <span className="text-sm font-bold text-[var(--vital-ink)]">
                미납 {unpaid.length}건
              </span>
              <span className="font-data text-sm font-bold text-[var(--ink)]">
                <CountUp value={unpaid.reduce((s, v) => s + v.amount, 0)} suffix="원" />
              </span>
            </div>
          )}

          <p className="mb-2 mt-5 px-1 font-data text-[10px] uppercase tracking-[0.2em] text-[var(--ink-2)]">
            진료 기록
          </p>
          <div className="flex flex-col gap-3">
            {visits.map((v) => (
              <VisitCard
                key={v.id}
                visit={v}
                open={openId === v.id}
                onToggle={() => setOpenId((id) => (id === v.id ? null : v.id))}
                onPay={() => setPayTarget(v)}
              />
            ))}
          </div>
        </main>

        <BottomSheet
          open={payTarget !== null}
          title="진료비를 수납할까요?"
          onClose={() => setPayTarget(null)}
        >
          {payTarget && (
            <>
              <div className="rounded-2xl bg-[var(--paper)] px-4 py-3">
                <p className="text-sm font-bold text-[var(--ink)]">{payTarget.hospital}</p>
                <p className="font-data text-[11px] text-[var(--ink-2)]">
                  {payTarget.date} · {payTarget.dept}
                </p>
                <p className="mt-3 text-right font-data text-[34px] font-bold leading-none tracking-tight text-[var(--ink)]">
                  {won(payTarget.amount)}
                </p>
              </div>
              <p className="mt-3 rounded-2xl border-l-4 border-[var(--ink)] bg-[var(--surface)] px-3 py-2 text-[11px] leading-relaxed text-[var(--ink-2)]">
                <strong className="text-[var(--ink)]">시연</strong> — 실제로 돈이 움직이지 않아요.
                병원 수납·결제(PG) 연동 후 같은 흐름으로 결제됩니다.
              </p>
              <button
                type="button"
                onClick={confirmPay}
                className="mt-4 w-full rounded-2xl bg-[var(--ink)] py-3.5 text-base font-bold text-white active:brightness-110"
              >
                {won(payTarget.amount)} 수납하기
              </button>
              <button
                type="button"
                onClick={() => setPayTarget(null)}
                className="mt-2 w-full rounded-2xl py-3 text-sm font-bold text-[var(--ink-2)] active:bg-[var(--paper)]"
              >
                취소
              </button>
            </>
          )}
        </BottomSheet>
      </div>
    </div>
  );
}

function VisitCard({
  visit,
  open,
  onToggle,
  onPay,
}: {
  visit: Visit;
  open: boolean;
  onToggle: () => void;
  onPay: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-[var(--surface)] shadow-[0_1px_12px_rgba(11,59,60,0.07)]">
      <div
        className={`absolute inset-y-0 left-0 w-1 ${
          visit.status === "수납대기"
            ? "bg-[var(--vital)]"
            : visit.status === "예약"
              ? "bg-[var(--ink)]"
              : "bg-[var(--refund)]"
        }`}
      />
      <button
        type="button"
        onClick={onToggle}
        className="block w-full px-5 py-4 pl-6 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--ink)]">{visit.hospital}</p>
            <p className="font-data text-[11px] text-[var(--ink-2)]">
              {visit.date} · {visit.dept}
            </p>
            <p className="mt-1 truncate text-xs text-[var(--ink-2)]">{visit.reason}</p>
          </div>
          <div className="flex-none text-right">
            <p className="font-data text-base font-bold text-[var(--ink)]">
              {won(visit.amount)}
            </p>
            <span
              className={`mt-1 inline-block rounded-full px-2 py-0.5 font-data text-[10px] font-bold ${STATUS_BADGE[visit.status].cls}`}
            >
              {STATUS_BADGE[visit.status].label}
            </span>
          </div>
        </div>
      </button>

      {open && (
        <div className="animate-reveal-in border-t border-[var(--mist)] px-5 py-4 pl-6">
          <div className="mb-4">
            <Stepper steps={VISIT_STEPS} current={VISIT_STEP_INDEX[visit.status]} />
          </div>
          <Section label="방문 사유">
            <p className="text-sm text-[var(--ink)]">{visit.reason}</p>
          </Section>

          {visit.opinion && (
            <Section label="소견서">
              <p className="text-sm leading-relaxed text-[var(--ink)]">{visit.opinion}</p>
            </Section>
          )}

          <Section label="처방전">
            {visit.prescriptions && visit.prescriptions.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {visit.prescriptions.map((p) => (
                  <li
                    key={p.drug}
                    className="rounded-xl bg-[var(--paper)] px-3 py-2"
                  >
                    <p className="text-sm font-semibold text-[var(--ink)]">{p.drug}</p>
                    <p className="font-data text-[11px] text-[var(--ink-2)]">
                      {p.dose} · {p.days}일분
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--ink-2)]">처방 없음</p>
            )}
          </Section>

          {isUnpaid(visit) && (
            <button
              type="button"
              onClick={onPay}
              className="mt-2 w-full rounded-2xl bg-[var(--ink)] py-3 text-sm font-bold text-white active:brightness-110"
            >
              수납하기 · {won(visit.amount)} (시연)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 font-data text-[10px] uppercase tracking-wider text-[var(--ink-2)]">
        {label}
      </div>
      {children}
    </div>
  );
}
