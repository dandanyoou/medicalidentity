/**
 * 상태 스텝퍼 — "접수 → 심사 → 지급" 같은 진행 상태를 한눈에.
 * 보맵·환급금24·토스의 상태 트래커 패턴. index <= current는 도달한 단계,
 * current가 현재 단계(강조), 그 이후는 대기.
 */
export interface Step {
  label: string;
  desc?: string;
}

export function Stepper({ steps, current }: { steps: Step[]; current: number }) {
  return (
    <ol className="flex items-start" aria-label="진행 상태">
      {steps.map((s, i) => {
        const reached = i <= current;
        const isCurrent = i === current;
        const last = i === steps.length - 1;
        return (
          <li key={s.label} className="relative flex flex-1 flex-col items-center">
            {!last && (
              <span
                aria-hidden="true"
                className={`absolute left-1/2 top-3 h-0.5 w-full ${
                  i < current ? "bg-[var(--refund)]" : "bg-[var(--mist)]"
                }`}
              />
            )}
            <span
              aria-current={isCurrent ? "step" : undefined}
              className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition ${
                reached
                  ? isCurrent
                    ? "bg-[var(--ink)] text-white ring-4 ring-[var(--ink)]/15"
                    : "bg-[var(--refund)] text-white"
                  : "border border-[var(--mist)] bg-[var(--surface)] text-[var(--ink-2)]"
              }`}
            >
              {reached && !isCurrent ? "✓" : i + 1}
            </span>
            <span
              className={`mt-1.5 text-center text-[11px] font-bold ${
                reached ? "text-[var(--ink)]" : "text-[var(--ink-2)]/70"
              }`}
            >
              {s.label}
            </span>
            {s.desc && (
              <span className="mt-0.5 text-center font-data text-[9px] text-[var(--ink-2)]">
                {s.desc}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
