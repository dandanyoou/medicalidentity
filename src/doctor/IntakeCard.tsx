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
        <PatientHeader visit={visit} />
        <div className="mt-3 rounded-2xl bg-[var(--paper)] px-3 py-2.5">
          <p className="text-xs text-[var(--ink-2)]">대화형 문진 없이 예약했어요. 예약 사유만 있어요.</p>
          <p className="mt-1 text-sm text-[var(--ink)]">{visit.reason}</p>
        </div>
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
      <PatientHeader visit={visit} />
      {flag && (
        <p className="mt-3 rounded-xl border-l-4 border-[var(--vital)] bg-[var(--vital)]/8 px-3 py-2 text-[11px] leading-relaxed text-[var(--vital-ink)]">
          환자 화면에 "{flag.level}" 안내가 표시됐어요 — {flag.message}
        </p>
      )}

      {/* 카드 속 카드 — 환자가 고른 답은 paper 안쪽 카드에 */}
      <dl className="mt-3 flex flex-col gap-2.5 rounded-2xl bg-[var(--paper)] px-3 py-3 text-sm">
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
        /* 표 — 헤더 행은 흐린 글씨·흰 면, 본문 행은 헤어라인. 소견·처방은 환자 기록 그대로. */
        <div className="mt-2 overflow-x-auto rounded-2xl bg-[var(--paper)] px-2 pb-1">
          {/* 폰 폭(375px)에서는 4열이 안 들어가므로 최소 폭을 주고 가로 스크롤(접수 노트북에서는 그대로 한 줄). */}
          <table className="w-full min-w-[480px] border-collapse text-left text-[11px] leading-relaxed">
            <thead>
              <tr className="whitespace-nowrap text-[10px] font-semibold text-[var(--ink-2)]">
                <th scope="col" className="rounded-l-xl bg-[var(--surface)] px-2 py-2 font-semibold">날짜</th>
                <th scope="col" className="bg-[var(--surface)] px-2 py-2 font-semibold">병원 · 과</th>
                <th scope="col" className="bg-[var(--surface)] px-2 py-2 font-semibold">소견</th>
                <th scope="col" className="rounded-r-xl bg-[var(--surface)] px-2 py-2 font-semibold">처방</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--mist)]">
              {past.map((h) => (
                <tr key={h.id} className="align-top">
                  <td className="whitespace-nowrap px-2 py-2 font-data text-[10px] text-[var(--ink-2)]">{h.date}</td>
                  <td className="px-2 py-2 text-[var(--ink)]">
                    {h.hospital}
                    <span className="block font-data text-[10px] text-[var(--ink-2)]">{h.dept}</span>
                  </td>
                  <td className="px-2 py-2 text-[var(--ink)]">{h.opinion || <span className="text-[var(--ink-2)]">—</span>}</td>
                  <td className="px-2 py-2 text-[var(--ink-2)]">{h.drugs.length > 0 ? h.drugs.join(", ") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const STATUS_CHIP: Record<Visit["status"], string> = {
  예약: "bg-[var(--ink)] text-white",
  수납대기: "bg-[var(--vital)]/12 text-[var(--vital-ink)]",
  완료: "bg-[var(--refund)]/12 text-[var(--refund-ink)]",
};

/** 환자 헤더 카드 — 이니셜 원 · 이름 · 상태 칩 · 메타(시각 · 과 · 이유). 이름은 방문 기록의 표시 이름 그대로. */
function PatientHeader({ visit }: { visit: Visit }) {
  const name = visit.patientName ?? "환자";
  return (
    <div role="group" aria-label="환자" className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[var(--ink)] text-base font-bold text-white"
      >
        {name.slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-base font-extrabold tracking-tight text-[var(--ink)]">
          <span className="truncate">{name}</span>
          <span className={`flex-none rounded-full px-2 py-0.5 font-data text-[10px] font-bold ${STATUS_CHIP[visit.status]}`}>
            {visit.status}
          </span>
        </p>
        <p className="truncate font-data text-[11px] text-[var(--ink-2)]">
          {visit.time ?? "—"} · {visit.dept} · {visit.reason}
        </p>
      </div>
    </div>
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
