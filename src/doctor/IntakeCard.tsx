import { listVisits, type Visit } from "../visits/store";
import { intakeView } from "./intakeView";
import { historyLine, pastVisits } from "./history";
import { checkRedFlags, recommendDepts } from "../intake/triage";
import { CompleteVisitForm } from "./CompleteVisitForm";
import { ReviewPrompt } from "./ReviewPrompt";

/**
 * 의사 사전 문진 카드.
 *
 * 원칙(docs/doctor-loop.md "의사 화면 원칙"): 환자가 고른 답과 직접 쓴 말을 그대로
 * 보여주고 우리 해석을 섞지 않는다. 우리 추천 진료과는 "환자가 받은 안내"로 작게만.
 * 진단·판단은 의사 몫이다.
 */
export function IntakeCard({
  visit,
  onComplete,
}: {
  visit: Visit;
  /** 진료 완료 저장 후 호출 — 대기열이 다시 읽게. */
  onComplete?: (updated: Visit) => void;
}) {
  const completeForm =
    visit.status === "예약" && onComplete ? <CompleteVisitForm visit={visit} onDone={onComplete} /> : null;

  if (!visit.intake) {
    return (
      <section aria-label="사전 문진" className="mt-2 rounded-2xl bg-[var(--surface)] px-4 py-3">
        <p className="text-xs text-[var(--ink-2)]">대화형 문진 없이 예약했어요. 예약 사유만 있어요.</p>
        <p className="mt-1 text-sm text-[var(--ink)]">{visit.reason}</p>
        <HistoryPanel visit={visit} />
        {completeForm}
      </section>
    );
  }

  const r = visit.intake;
  const v = intakeView(r);
  const flag = checkRedFlags(r);
  const rec = recommendDepts(r);

  return (
    <section
      aria-label="사전 문진"
      className="mt-2 animate-reveal-in rounded-2xl bg-[var(--surface)] px-4 py-3 shadow-[0_1px_12px_rgba(11,59,60,0.07)]"
    >
      {flag && (
        <p className="mb-3 rounded-xl border-l-4 border-[var(--vital)] bg-[var(--vital)]/8 px-3 py-2 text-[11px] leading-relaxed text-[var(--vital-ink)]">
          환자 화면에 "{flag.level}" 안내가 표시됐어요 — {flag.message}
        </p>
      )}

      <dl className="flex flex-col gap-2.5 text-sm">
        {v.primary && v.parts.length > 1 && (
          <Row label="가장 불편한 곳">
            <strong className="text-[var(--ink)]">{v.primary}</strong>
          </Row>
        )}
        <Row label="부위 · 느낌">
          <ul className="flex flex-col gap-1">
            {v.parts.map((p) => (
              <li key={p.part} className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-semibold text-[var(--ink)]">{p.part}</span>
                <span className="text-[var(--ink)]">{p.feeling}</span>
                {p.hint && <span className="text-[11px] text-[var(--ink-2)]">{p.hint}</span>}
              </li>
            ))}
          </ul>
        </Row>
        {v.onset && <Row label="시작">{v.onset}</Row>}
        {v.severity && <Row label="아픈 정도">{v.severity}</Row>}
        <Row label="심해지는 때">{v.triggers.length > 0 ? v.triggers.join(", ") : "특별히 없다고 답함"}</Row>
        <Row label="동반 증상">
          {v.associated.length > 0 ? (
            v.associated.join(", ")
          ) : v.denied.length > 0 ? (
            <span className="text-[var(--ink-2)]">없다고 답함 ({v.denied.join(", ")})</span>
          ) : (
            "—"
          )}
        </Row>
        {v.note && (
          <Row label="환자가 쓴 말">
            <span className="text-[var(--ink)]">“{v.note}”</span>
          </Row>
        )}
      </dl>

      {rec && (
        <p className="mt-3 border-t border-[var(--mist)] pt-2 text-[10px] leading-relaxed text-[var(--ink-2)]">
          환자가 받은 안내: {rec.depts.join(" · ")} (규칙 기반 진료과 안내, 진단 아님)
        </p>
      )}
      <ReviewPrompt visit={visit} recommended={rec?.depts ?? []} />
      <HistoryPanel visit={visit} />
      {completeForm}
    </section>
  );
}

/** 같은 환자의 지난 방문 — 이 기기에 저장된 진료 기록만(시연). */
function HistoryPanel({ visit }: { visit: Visit }) {
  const past = pastVisits(listVisits(), visit).map(historyLine);
  return (
    <section aria-label="지난 방문" className="mt-3 border-t border-[var(--mist)] pt-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-bold text-[var(--ink)]">지난 방문</h3>
        <span className="text-[10px] text-[var(--ink-2)]">이 기기 기록 · 최근 {past.length}건</span>
      </div>
      {past.length === 0 ? (
        <p className="mt-1 text-[11px] text-[var(--ink-2)]">이 기기에 지난 방문 기록이 없어요. (EMR 연동 전 — 다른 병원 기록은 보이지 않아요)</p>
      ) : (
        <ol className="mt-1.5 space-y-1.5">
          {past.map((h) => (
            <li key={h.id} className="rounded-xl bg-[var(--paper)] px-3 py-2 text-[11px] leading-relaxed">
              <p className="font-data text-[10px] text-[var(--ink-2)]">
                {h.date} · {h.hospital} · {h.dept}
              </p>
              {h.opinion && <p className="mt-0.5 text-[var(--ink)]">{h.opinion}</p>}
              {h.drugs.length > 0 && <p className="mt-0.5 text-[var(--ink-2)]">처방: {h.drugs.join(", ")}</p>}
              {!h.opinion && h.drugs.length === 0 && <p className="mt-0.5 text-[var(--ink-2)]">소견·처방 기록 없음</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 flex-none pt-0.5 text-[11px] text-[var(--ink-2)]">{label}</dt>
      <dd className="min-w-0 flex-1 text-[var(--ink)]">{children}</dd>
    </div>
  );
}
