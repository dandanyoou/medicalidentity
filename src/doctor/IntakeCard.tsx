import type { Visit } from "../visits/store";
import { intakeView } from "./intakeView";
import { checkRedFlags, recommendDepts } from "../intake/triage";

/**
 * 의사 사전 문진 카드.
 *
 * 원칙(docs/doctor-loop.md "의사 화면 원칙"): 환자가 고른 답과 직접 쓴 말을 그대로
 * 보여주고 우리 해석을 섞지 않는다. 우리 추천 진료과는 "환자가 받은 안내"로 작게만.
 * 진단·판단은 의사 몫이다.
 */
export function IntakeCard({ visit }: { visit: Visit }) {
  if (!visit.intake) {
    return (
      <section aria-label="사전 문진" className="mt-2 rounded-2xl bg-[var(--surface)] px-4 py-3">
        <p className="text-xs text-[var(--ink-2)]">대화형 문진 없이 예약했어요. 예약 사유만 있어요.</p>
        <p className="mt-1 text-sm text-[var(--ink)]">{visit.reason}</p>
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
