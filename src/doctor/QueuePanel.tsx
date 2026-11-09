import { useMemo, useState } from "react";
import { listVisits } from "../visits/store";
import { getMember } from "../family/store";
import { todayQueue } from "./queue";
import { IntakeCard } from "./IntakeCard";

/**
 * 오늘 진료 대기열 — 환자가 예약 화면에서 잡은 오늘 예약을 시각 순으로 보여준다.
 *
 * 정직: 병원 예약 시스템(EMR) 연동이 아니다. 환자 화면과 의사 화면이 같은 기기의
 * 저장소를 함께 쓰는 시연이라, 이 기기에서 예약한 건만 보인다.
 */
export function QueuePanel() {
  const queue = useMemo(() => todayQueue(listVisits()), []);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section
      aria-labelledby="queue-title"
      className="mb-4 rounded-3xl bg-[var(--surface)] p-5 shadow-[0_1px_12px_rgba(11,59,60,0.07)]"
    >
      <div className="flex items-center justify-between">
        <h2 id="queue-title" className="text-sm font-bold text-[var(--ink)]">
          오늘 진료 대기열
        </h2>
        <span className="rounded-full bg-[var(--ink)] px-2 py-0.5 font-data text-[10px] font-bold text-white">
          대기 {queue.length}명
        </span>
      </div>

      {queue.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-[var(--paper)] px-4 py-3 text-xs leading-relaxed text-[var(--ink-2)]">
          오늘 예약된 환자가 없어요. 환자 화면의 진료 예약에서 오늘 시간으로 예약하면 여기에
          나타나요.
        </p>
      ) : (
        <ol className="mt-3 flex flex-col gap-2">
          {queue.map((v) => {
            const name = getMember(v.memberId)?.name ?? "환자";
            const open = openId === v.id;
            return (
              <li key={v.id} className="rounded-2xl bg-[var(--paper)] px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="w-12 flex-none font-data text-sm font-bold text-[var(--ink)]">
                    {v.time ?? "—"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[var(--ink)]">{name}</p>
                    <p className="font-data text-[11px] text-[var(--ink-2)]">{v.dept}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--ink-2)]">{v.reason}</p>
                  </div>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-label={`${name} 사전 문진 보기`}
                    onClick={() => setOpenId(open ? null : v.id)}
                    className="flex min-h-[44px] flex-none items-center rounded-xl border border-[var(--mist)] px-3 text-xs font-bold text-[var(--ink)] active:bg-[var(--mist)]"
                  >
                    {open ? "닫기" : "문진"}
                  </button>
                </div>
                {open && <IntakeCard visit={v} />}
              </li>
            );
          })}
        </ol>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-[var(--ink-2)]">
        시연 — 병원 예약 시스템 연동 전이라, 환자 화면과 같은 기기에 저장된 예약만 보여요.
      </p>
    </section>
  );
}
