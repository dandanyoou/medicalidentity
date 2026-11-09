import { useEffect, useMemo, useState } from "react";
import {
  SEOUL_INDEX,
  displayName,
  filterHospitals,
  loadGuHospitals,
  matchesDept,
  type Hospital,
} from "./hospitals";

const GU_KEY = "medid.booking.gu.v1";
const PAGE = 30;

function readSavedGu(): string {
  try {
    const v = localStorage.getItem(GU_KEY) ?? "";
    return SEOUL_INDEX.gus.some((g) => g.gu === v) ? v : "";
  } catch {
    return "";
  }
}

/**
 * 서울 병원 고르기 — 상급종합병원은 바로, 나머지는 구를 고르면 그 구 목록을 받아서.
 * 진료과를 넘기면 그 과가 있는 곳만 보여준다.
 */
export function HospitalPicker({
  dept,
  onPick,
}: {
  dept: string | null;
  /** 공식 요양기관명을 넘긴다(진료기록에 그대로 저장되는 이름). */
  onPick: (hospitalName: string) => void;
}) {
  const [gu, setGu] = useState<string>(readSavedGu);
  const [query, setQuery] = useState("");
  const [list, setList] = useState<Hospital[] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!gu) {
      setList(null);
      setState("idle");
      return;
    }
    let alive = true;
    setState("loading");
    setError(null);
    setLimit(PAGE);
    loadGuHospitals(gu).then(
      (data) => {
        if (!alive) return;
        setList(data);
        setState("idle");
      },
      (e: unknown) => {
        if (!alive) return;
        setList(null);
        setState("error");
        setError(e instanceof Error ? e.message : String(e));
      },
    );
    return () => {
      alive = false;
    };
  }, [gu, attempt]);

  function pickGu(next: string) {
    setGu(next);
    setQuery("");
    try {
      if (next) localStorage.setItem(GU_KEY, next);
      else localStorage.removeItem(GU_KEY);
    } catch {
      /* no-op */
    }
  }

  const filtered = useMemo(
    () => (list ? filterHospitals(list, { dept, query }) : []),
    [list, dept, query],
  );
  const shown = filtered.slice(0, limit);

  return (
    <div>
      {/* 큰 병원은 파일을 받기 전에도 바로 */}
      <p className="mb-2 text-xs font-semibold text-[var(--ink-2)]">서울 상급종합병원</p>
      <div className="mb-5 flex flex-wrap gap-2">
        {SEOUL_INDEX.major.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onPick(m.name)}
            className="rounded-2xl border border-[var(--mist)] bg-[var(--surface)] px-3.5 py-2.5 text-left text-sm font-semibold text-[var(--ink)] active:bg-[var(--paper)]"
          >
            {m.name}
            <span className="ml-1.5 font-data text-[10px] text-[var(--ink-2)]">{m.gu}</span>
          </button>
        ))}
      </div>

      <p className="mb-2 text-xs font-semibold text-[var(--ink-2)]">동네 병원 · 의원</p>
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="hospital-gu">
          구 선택
        </label>
        <select
          id="hospital-gu"
          value={gu}
          onChange={(e) => pickGu(e.target.value)}
          className="min-h-[44px] flex-none rounded-2xl border border-[var(--mist)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--ink)] outline-none focus:border-[var(--ink)]"
        >
          <option value="">구를 골라주세요</option>
          {SEOUL_INDEX.gus.map((g) => (
            <option key={g.gu} value={g.gu}>
              {g.gu} ({g.count.toLocaleString("ko-KR")})
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="hospital-query">
          병원 이름·동으로 검색
        </label>
        <input
          id="hospital-query"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(PAGE);
          }}
          placeholder="병원 이름·동으로 검색"
          disabled={!list}
          className="min-h-[44px] min-w-0 flex-1 rounded-2xl border border-[var(--mist)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--ink)] disabled:opacity-50"
        />
      </div>

      {state === "loading" && (
        <p className="mt-3 text-xs text-[var(--ink-2)]" aria-live="polite">
          {gu} 병원 목록을 불러오는 중…
        </p>
      )}

      {state === "error" && (
        <div
          role="alert"
          className="mt-3 rounded-2xl border-l-4 border-[var(--vital)] bg-[var(--vital)]/8 px-4 py-3 text-xs text-[var(--vital-ink)]"
        >
          {error}
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="ml-2 font-bold underline"
          >
            다시 시도
          </button>
        </div>
      )}

      {list && state === "idle" && (
        <>
          {filtered.length === 0 ? (
            <p className="mt-3 rounded-2xl bg-[var(--surface)] px-4 py-3 text-xs text-[var(--ink-2)]">
              찾는 병원이 없어요.{" "}
              {dept && list.some((h) => !matchesDept(h, dept))
                ? `${gu}에서 ${dept}가 있는 곳만 보여주고 있어요. 검색어를 지우거나 다른 구를 골라보세요.`
                : "검색어를 바꾸거나 다른 구를 골라보세요."}
            </p>
          ) : (
            <>
              <p className="mb-2 mt-3 font-data text-[11px] text-[var(--ink-2)]">
                {filtered.length.toLocaleString("ko-KR")}곳
                {dept ? ` · ${dept}` : ""}
              </p>
              <ul aria-label={`${gu} 병원 목록`} className="flex flex-col gap-2">
                {shown.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => onPick(h.name)}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--mist)] bg-[var(--surface)] px-4 py-3 text-left active:bg-[var(--paper)]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-[var(--ink)]">
                          {displayName(h)}
                        </span>
                        <span className="block font-data text-[11px] text-[var(--ink-2)]">
                          {h.type}
                          {h.dong ? ` · ${h.dong}` : ""}
                        </span>
                      </span>
                      <span className="flex-none text-[var(--ink-2)]">›</span>
                    </button>
                  </li>
                ))}
              </ul>
              {filtered.length > shown.length && (
                <button
                  type="button"
                  onClick={() => setLimit((n) => n + PAGE)}
                  className="mt-3 w-full rounded-2xl border border-[var(--mist)] py-3 text-sm font-bold text-[var(--ink-2)] active:bg-[var(--paper)]"
                >
                  더 보기 ({(filtered.length - shown.length).toLocaleString("ko-KR")}곳 남음)
                </button>
              )}
            </>
          )}
        </>
      )}

      <p className="mt-4 text-[10px] leading-relaxed text-[var(--ink-2)]">
        출처: {SEOUL_INDEX.source} ({SEOUL_INDEX.asOf} 기준), {SEOUL_INDEX.license}. 서울{" "}
        {SEOUL_INDEX.total.toLocaleString("ko-KR")}곳. 예약은 시연이며 병원과 연동되지 않아요.
      </p>
    </div>
  );
}
