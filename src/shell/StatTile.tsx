import { Link } from "react-router-dom";

export type TileTone = "vital" | "refund" | "ink";

const BAR: Record<TileTone, string> = {
  vital: "bg-[var(--vital)]",
  refund: "bg-[var(--refund)]",
  ink: "bg-[var(--ink)]",
};

/**
 * 숫자 타일 — 작은 라벨 → 큰 숫자 → 점선 미터 → 의미색 막대(참고 영상 규칙 2).
 * 막대 길이는 ratio(0~1). 숫자는 한 타일에 하나만. `to`가 있으면 링크, 없으면 그냥 카드.
 */
export function StatTile({
  to,
  label,
  value,
  unit,
  hint,
  ratio,
  tone,
}: {
  to?: string;
  label: string;
  value: string;
  unit: string;
  hint: string;
  ratio: number;
  tone: TileTone;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  const cls =
    "flex flex-col rounded-[24px] bg-[var(--surface)] px-4 pb-4 pt-3.5 shadow-[0_1px_12px_rgba(11,59,60,0.07)] transition active:scale-[0.99]";
  const body = (
    <>
      <p className="text-[11px] font-semibold text-[var(--ink-2)]">{label}</p>
      <p className="mt-1 whitespace-nowrap font-data text-[24px] font-bold leading-none tracking-tight text-[var(--ink)] md:text-[30px]">
        <span>{value}</span>
        <span className="ml-0.5 text-[13px] font-semibold text-[var(--ink-2)]">{unit}</span>
      </p>
      <p className="mt-1 text-[10px] text-[var(--ink-2)]">{hint}</p>
      <div
        aria-hidden="true"
        className="mt-auto h-2 pt-3"
        style={{
          backgroundImage: "radial-gradient(circle, var(--mist) 1px, transparent 1.2px)",
          backgroundSize: "6px 6px",
        }}
      />
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[var(--paper)]">
        <div
          role="meter"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className={`h-full rounded-full ${BAR[tone]}`}
          style={{ width: `${Math.max(pct, pct > 0 ? 8 : 0)}%` }}
        />
      </div>
    </>
  );
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
