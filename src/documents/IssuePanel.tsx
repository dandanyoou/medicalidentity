import { useMemo, useState } from "react";
import { listVisits, type Visit } from "../visits/store";
import { getMember } from "../family/store";
import { localDateKey } from "../doctor/queue";
import type { Session } from "../hospital/badge";
import { DOC_KINDS, RELAY_DAYS, documentsForVisit, issueBlocker, issueDocument, type IssuedDocument } from "./store";

/**
 * 의사 화면 "서류 발급" — 오늘 진료를 마친 환자에게 진단서·소견서·처방전 사본·영수증을
 * 병원 키로 서명해 환자 지갑으로 보낸다(시연: 같은 기기 저장소).
 */
export function IssuePanel({ session, version = 0 }: { session: Session; version?: number }) {
  const [tick, setTick] = useState(0);
  const today = localDateKey();
  const done = useMemo(
    () => listVisits().filter((v) => v.date === today && v.status !== "예약").sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")),
    [today, tick, version],
  );
  const [error, setError] = useState<string | null>(null);

  function issue(v: Visit, kind: (typeof DOC_KINDS)[number]["kind"]) {
    setError(null);
    try {
      issueDocument({ visit: v, kind, session });
      setTick((t) => t + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <section aria-labelledby="issue-title" className="mb-4 rounded-3xl bg-[var(--surface)] p-5 shadow-[0_1px_12px_rgba(11,59,60,0.07)]">
      <div className="flex items-center justify-between">
        <h2 id="issue-title" className="text-sm font-bold text-[var(--ink)]">서류 발급</h2>
        <span className="text-[10px] text-[var(--ink-2)]">시연 · 병원 서명 · 환자 지갑으로</span>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--ink-2)]">
        오늘 진료를 마친 환자에게 보냅니다. 진단서·소견서는 의사 배지만, 처방전은 환자 보관용 사본만(약국 전송 아님).
        {RELAY_DAYS}일 안에 환자가 안 열면 중계 사본은 폐기됩니다.
      </p>

      {error && (
        <p role="alert" className="mt-3 rounded-2xl bg-[var(--vital)]/10 px-4 py-2 text-xs font-bold text-[var(--vital-ink)]">
          {error}
        </p>
      )}

      {done.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-[var(--paper)] px-4 py-3 text-xs text-[var(--ink-2)]">오늘 진료를 마친 환자가 아직 없어요.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {done.map((v) => {
            const name = v.patientName ?? getMember(v.memberId)?.name ?? "환자";
            const docs = documentsForVisit(v.id);
            return (
              <li key={v.id} className="rounded-2xl bg-[var(--paper)] px-4 py-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-data text-xs font-bold text-[var(--ink-2)]">{v.time ?? "—"}</span>
                  <span className="text-sm font-bold text-[var(--ink)]">{name}</span>
                  <span className="font-data text-[11px] text-[var(--ink-2)]">{v.dept}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {DOC_KINDS.map((k) => {
                    const blocker = issueBlocker(v, k.kind, session.role);
                    return (
                      <button
                        key={k.kind}
                        type="button"
                        aria-label={`${name} ${k.kind} 발급`}
                        title={blocker ?? k.desc}
                        disabled={!!blocker}
                        onClick={() => issue(v, k.kind)}
                        className="min-h-[36px] rounded-xl border border-[var(--mist)] bg-[var(--surface)] px-3 text-xs font-bold text-[var(--ink)] active:bg-[var(--mist)] disabled:opacity-40"
                      >
                        {k.kind}
                      </button>
                    );
                  })}
                </div>
                {docs.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {docs.map((d) => (
                      <li key={d.id} className="text-[11px] text-[var(--ink-2)]">
                        {docLine(d)}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function docLine(d: IssuedDocument): string {
  const t = new Date(d.issuedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  const state = d.status === "received" ? "환자가 받음" : d.status === "expired" ? "미수령 폐기" : "환자 지갑으로 보냄(시연)";
  return `${d.kind} · ${t} · ${d.issuedBy.name} · ${state}`;
}
