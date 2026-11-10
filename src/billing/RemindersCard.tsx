import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listVisits } from "../visits/store";
import { buildReminders, type Reminder } from "../visits/reminders";
import { localDateKey } from "../doctor/queue";

/**
 * 다시 올 때 · 복약 — 환자 재방문 고리(R7).
 *
 * 의사가 권고한 재진일과 처방 일수 안의 복약을 카드로 보여주고, 재진은 바로 예약으로 잇는다.
 * 기기 알림은 시연이다: 서버·푸시가 없어 앱을 열었을 때 브라우저 알림 권한으로 한 번 띄울 뿐,
 * 앱을 닫은 뒤 정해진 시각에 울리지는 않는다(그건 푸시 서버가 생긴 뒤).
 */
const NOTIFIED_KEY = "medid.reminders.notified";

type Perm = "unsupported" | "default" | "granted" | "denied";

function permission(): Perm {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission as Perm;
}

/** 오늘 아직 안 띄웠으면 다가온 알림을 기기 알림으로 한 번 보여준다(권한이 있을 때만). */
export function notifyOnce(reminders: Reminder[], today: string = localDateKey()): boolean {
  if (permission() !== "granted" || reminders.length === 0) return false;
  try {
    if (localStorage.getItem(NOTIFIED_KEY) === today) return false;
    const due = reminders.filter((r) => r.daysLeft <= 1);
    if (due.length === 0) return false;
    const body = due.map(line).join("\n");
    new Notification("가족 의료지갑 · 다시 올 때", { body });
    localStorage.setItem(NOTIFIED_KEY, today);
    return true;
  } catch {
    return false;
  }
}

function line(r: Reminder): string {
  if (r.kind === "재진") return r.daysLeft < 0 ? `${r.hospital} 재진 권고일(${r.date})이 지났어요` : `${r.hospital} 재진 권고 D-${r.daysLeft} (${r.date})`;
  return `복약 ${r.drug} ${r.dose} · ${r.daysLeft === 0 ? "오늘까지" : `D-${r.daysLeft}`}`;
}

export function RemindersCard({ memberId }: { memberId: string }) {
  const today = localDateKey();
  const reminders = useMemo(() => buildReminders(listVisits(memberId), { today }), [memberId, today]);
  const [perm, setPerm] = useState<Perm>(() => permission());
  const [note, setNote] = useState<string | null>(null);

  async function enable() {
    if (perm === "unsupported") {
      setNote("이 브라우저는 기기 알림을 지원하지 않아요.");
      return;
    }
    try {
      const p = (await Notification.requestPermission()) as Perm;
      setPerm(p);
      if (p === "granted") {
        const shown = notifyOnce(reminders, today);
        setNote(shown ? "다가온 알림을 기기 알림으로 띄웠어요(시연)." : "권한이 켜졌어요. 다가온 재진·복약이 있으면 앱을 열 때 알려드려요(시연).");
      } else {
        setNote("알림 권한이 꺼져 있어요. 브라우저 설정에서 허용할 수 있어요.");
      }
    } catch {
      setNote("알림 권한을 요청하지 못했어요.");
    }
  }

  return (
    <section aria-labelledby="rem-h" className="mb-5 rounded-3xl bg-[var(--surface)] px-5 py-4 shadow-[0_1px_12px_rgba(11,59,60,0.07)]">
      <div className="flex items-center justify-between">
        <h2 id="rem-h" className="text-sm font-bold text-[var(--ink)]">다시 올 때 · 복약</h2>
        <span className="font-data text-[10px] text-[var(--ink-2)]">시연 · 기기에서 계산</span>
      </div>

      {reminders.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-[var(--ink-2)]">
          지금은 다가온 재진·복약이 없어요. 의사가 재진을 권고하거나 처방이 있으면 여기에 떠요.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {reminders.map((r, i) => (
            <li key={`${r.kind}-${r.visitId}-${i}`} className="rounded-2xl bg-[var(--paper)] px-4 py-3">
              {r.kind === "재진" ? (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[var(--ink)]">
                      재진 권고 · {r.daysLeft < 0 ? "권고일 지남" : `D-${r.daysLeft}`}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--ink-2)]">
                      {r.date} · {r.hospital} · {r.dept}
                    </p>
                  </div>
                  <Link to="/booking" className="flex-none rounded-full bg-[var(--ink)] px-4 py-2 text-xs font-extrabold text-white">
                    재진 예약
                  </Link>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-bold text-[var(--ink)]">
                    복약 중 · {r.daysLeft === 0 ? "오늘까지" : `D-${r.daysLeft}`}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--ink-2)]">
                    {r.drug} · {r.dose} · {r.hospital}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex items-start justify-between gap-3 border-t border-[var(--mist)] pt-3">
        <p className="text-[10px] leading-relaxed text-[var(--ink-2)]">
          기기 알림(시연): 앱을 열 때 다가온 재진·복약을 브라우저 알림으로 한 번 띄워요. 앱을 닫은 뒤 정해진 시각에
          울리는 건 푸시 서버가 생긴 뒤예요.
          {note && <span className="mt-1 block font-bold text-[var(--ink)]">{note}</span>}
        </p>
        <button
          type="button"
          onClick={enable}
          disabled={perm === "granted"}
          className="flex min-h-[36px] flex-none items-center rounded-xl border border-[var(--mist)] px-3 text-[11px] font-bold text-[var(--ink)] disabled:opacity-50"
        >
          {perm === "granted" ? "기기 알림 켜짐" : "기기 알림 켜기"}
        </button>
      </div>
    </section>
  );
}
