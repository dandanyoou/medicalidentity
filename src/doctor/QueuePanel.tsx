import { useEffect, useMemo, useState } from "react";
import { listVisits, type Visit } from "../visits/store";
import { getMember } from "../family/store";
import { todayQueue } from "./queue";
import { IntakeCard } from "./IntakeCard";
import { DEMO_ID_PREFIX, clearDemoPatients, hasDemoPatients, seedDemoPatients } from "./demo";

/**
 * 오늘 진료 대기열 — 환자가 예약 화면에서 잡은 오늘 예약을 시각 순으로 보여준다.
 *
 * 정직: 병원 예약 시스템(EMR) 연동이 아니다. 환자 화면과 의사 화면이 같은 기기의
 * 저장소를 함께 쓰는 시연이라, 이 기기에서 예약한 건만 보인다.
 *
 * 배치(R3): 폰 폭에서는 항목 아래에 문진 카드가 펼쳐지고, md 이상(접수 데스크 노트북)에서는
 * 왼쪽 목록 | 오른쪽 "선택한 환자" 2단이다. 어느 쪽이든 한 번에 한 환자만 연다.
 */
const DESKTOP = "(min-width: 768px)";

function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(() => (typeof window.matchMedia === "function" ? window.matchMedia(DESKTOP).matches : false));
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(DESKTOP);
    const on = () => setDesktop(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return desktop;
}

export function QueuePanel({ onChange }: { onChange?: () => void } = {}) {
  const [tick, setTick] = useState(0); // 시연 환자 불러오기·지우기 후 재조회
  const queue = useMemo(() => todayQueue(listVisits()), [tick]);
  const demoOn = useMemo(() => hasDemoPatients(), [tick]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const desktop = useIsDesktop();
  const selected = desktop ? queue.find((v) => v.id === openId) ?? null : null;

  function handleComplete(updated: Visit) {
    const name = nameOf(updated);
    setNotice(`${name}님 진료를 마쳤어요 — ${updated.amount.toLocaleString("ko-KR")}원 수납대기로 환자 수납 화면에 떴어요.`);
    setOpenId(null);
    setTick((t) => t + 1);
    onChange?.(); // 서류 발급 패널 등 같은 저장소를 보는 쪽에 알린다
  }

  function toggleDemo() {
    if (demoOn) clearDemoPatients();
    else seedDemoPatients();
    setOpenId(null);
    setTick((t) => t + 1);
    onChange?.();
  }

  const list =
    queue.length === 0 ? (
      <p className="mt-3 rounded-2xl bg-[var(--paper)] px-4 py-3 text-xs leading-relaxed text-[var(--ink-2)]">
        오늘 예약된 환자가 없어요. 환자 화면의 진료 예약에서 오늘 시간으로 예약하면 여기에
        나타나요.
      </p>
    ) : (
      <ol className="mt-3 flex flex-col gap-2">
        {queue.map((v) => {
          const name = nameOf(v);
          const isDemo = v.id.startsWith(DEMO_ID_PREFIX);
          const open = openId === v.id;
          return (
            <li
              key={v.id}
              className={`rounded-2xl px-4 py-3 ${open && desktop ? "bg-[var(--ink)] text-white" : "bg-[var(--paper)]"}`}
            >
              <div className="flex items-start gap-3">
                <span className={`w-12 flex-none font-data text-sm font-bold ${open && desktop ? "text-white" : "text-[var(--ink)]"}`}>
                  {v.time ?? "—"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`flex items-center gap-1.5 text-sm font-bold ${open && desktop ? "text-white" : "text-[var(--ink)]"}`}>
                    {name}
                    {isDemo && (
                      <span className="rounded-full bg-[var(--mist)] px-1.5 py-0.5 font-data text-[9px] font-bold text-[var(--ink-2)]">
                        시연
                      </span>
                    )}
                  </p>
                  <p className={`font-data text-[11px] ${open && desktop ? "text-white/70" : "text-[var(--ink-2)]"}`}>{v.dept}</p>
                  <p className={`mt-1 text-xs leading-relaxed ${open && desktop ? "text-white/80" : "text-[var(--ink-2)]"}`}>{v.reason}</p>
                </div>
                {desktop ? (
                  <button
                    type="button"
                    aria-pressed={open}
                    aria-label={`${name} 사전 문진 보기`}
                    onClick={() => setOpenId(v.id)}
                    className={`flex min-h-[44px] flex-none items-center rounded-xl border px-3 text-xs font-bold ${
                      open ? "border-white/30 bg-white/10 text-white" : "border-[var(--mist)] text-[var(--ink)] active:bg-[var(--mist)]"
                    }`}
                  >
                    {open ? "보는 중" : "선택"}
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-label={`${name} 사전 문진 보기`}
                    onClick={() => setOpenId(open ? null : v.id)}
                    className="flex min-h-[44px] flex-none items-center rounded-xl border border-[var(--mist)] px-3 text-xs font-bold text-[var(--ink)] active:bg-[var(--mist)]"
                  >
                    {open ? "닫기" : "문진"}
                  </button>
                )}
              </div>
              {!desktop && open && <IntakeCard visit={v} onComplete={handleComplete} />}
            </li>
          );
        })}
      </ol>
    );

  const queueSection = (
    <section
      aria-labelledby="queue-title"
      className="rounded-3xl bg-[var(--surface)] p-5 shadow-[0_1px_12px_rgba(11,59,60,0.07)]"
    >
      <div className="flex items-center justify-between">
        <h2 id="queue-title" className="text-sm font-bold text-[var(--ink)]">
          오늘 진료 대기열
        </h2>
        <span className="rounded-full bg-[var(--ink)] px-2 py-0.5 font-data text-[10px] font-bold text-white">
          대기 {queue.length}명
        </span>
      </div>

      {notice && (
        <p
          role="status"
          className="mt-3 rounded-2xl border-l-4 border-[var(--refund)] bg-[var(--refund)]/10 px-4 py-3 text-xs leading-relaxed text-[var(--refund-ink)]"
        >
          {notice}
        </p>
      )}

      {list}

      <div className="mt-3 flex items-start justify-between gap-3">
        <p className="text-[10px] leading-relaxed text-[var(--ink-2)]">
          시연 — 병원 예약 시스템 연동 전이라, 환자 화면과 같은 기기에 저장된 예약만 보여요.
          {!demoOn && " 다른 기기에서 보여줄 때는 시연 환자를 불러오세요."}
        </p>
        <button
          type="button"
          onClick={toggleDemo}
          className="flex min-h-[36px] flex-none items-center rounded-xl border border-[var(--mist)] px-3 text-[11px] font-bold text-[var(--ink-2)] active:bg-[var(--mist)]"
        >
          {demoOn ? "시연 환자 지우기" : "시연 환자 불러오기"}
        </button>
      </div>
    </section>
  );

  if (!desktop) return <div className="mb-4">{queueSection}</div>;

  return (
    <div className="mb-4 grid grid-cols-[minmax(280px,1fr)_1.5fr] items-start gap-4">
      {queueSection}
      <section
        aria-label="선택한 환자"
        className="rounded-3xl bg-[var(--surface)] p-5 shadow-[0_1px_12px_rgba(11,59,60,0.07)]"
      >
        {selected ? (
          <>
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-bold text-[var(--ink)]">
                {nameOf(selected)} <span className="font-data text-[11px] font-medium text-[var(--ink-2)]">{selected.time ?? ""} · {selected.dept}</span>
              </h2>
            </div>
            <IntakeCard key={selected.id} visit={selected} onComplete={handleComplete} />
          </>
        ) : (
          <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
            <p className="text-sm font-bold text-[var(--ink)]">왼쪽에서 환자를 고르세요</p>
            <p className="mt-1 text-xs text-[var(--ink-2)]">사전 문진 카드와 진료 완료 입력이 여기에 열려요.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function nameOf(v: Visit): string {
  return v.patientName ?? getMember(v.memberId)?.name ?? "환자";
}
