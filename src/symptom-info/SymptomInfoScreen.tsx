import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { searchSymptoms, type SymptomEntry } from "./data";

/**
 * 증상 정보 + 주변 병원·약국 찾기.
 *
 * 법적 경계(중요): 이 화면은 "병원을 추천"하지 않는다. 지도 서비스의 검색
 * 결과를 그대로 열어줄 뿐이고, 어떤 병원이 더 낫다는 판단을 내리지 않는다.
 * 증상 정보도 일반적인 공공보건 수준 참고용이며 진단이 아니다 — data.ts의
 * 주석 참고. 자유 텍스트 입력이어도 콘텐츠는 지어내지 않는다: 매칭 실패 시
 * 솔직하게 "등록된 정보가 없다"고 말한다(아래 generic fallback).
 */
function openNearbyMap(query: string) {
  function go(suffix: string) {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      query + suffix,
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }
  if (!navigator.geolocation) {
    go("");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => go(` ${pos.coords.latitude},${pos.coords.longitude}`),
    () => go(""), // 위치 거부/실패해도 카테고리 검색은 그대로 연다
    { timeout: 5000 },
  );
}

export function SymptomInfoScreen() {
  useEffect(() => {
    document.title = "증상 정보 — 참고용";
  }, []);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SymptomEntry | null>(null);

  const matches = useMemo(() => searchSymptoms(query), [query]);
  const noMatch = query.trim().length > 0 && matches.length === 0 && !selected;

  function handleSelect(entry: SymptomEntry) {
    setSelected(entry);
    setQuery(entry.label);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setSelected(null);
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-slate-50 shadow-xl">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur">
          <Link
            to="/wallet"
            aria-label="지갑으로 돌아가기"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
          >
            ‹
          </Link>
          <h1 className="text-base font-semibold text-slate-900">증상 정보</h1>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-8 pt-5">
          <div
            role="alert"
            className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900"
          >
            이 정보는 참고용이며 의학적 진단이 아닙니다. 증상이 심하거나
            걱정되면 반드시 의료진과 상담하세요. 응급 상황이면 즉시 119에
            연락하세요.
          </div>

          <section className="mb-4 rounded-3xl bg-white p-5 shadow-sm">
            <label className="mb-2 block text-sm font-medium text-slate-600" htmlFor="symptom-input">
              증상을 직접 적어보세요
            </label>
            <input
              id="symptom-input"
              type="text"
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              placeholder="예: 머리아픔, 속쓰림, 어지러움..."
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-600"
            />

            {!selected && matches.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {matches.slice(0, 8).map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => handleSelect(s)}
                    className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {noMatch && (
              <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                아직 등록된 정보가 없는 증상이에요 — 지어내지 않고 솔직하게
                말씀드려요. 증상이 계속되거나 걱정되면 병원에서 상담받는 게
                가장 정확합니다.
                <button
                  type="button"
                  onClick={() => openNearbyMap("병원")}
                  className="mt-2 block w-full rounded-full bg-slate-900 py-2.5 text-sm font-semibold text-white active:bg-slate-800"
                >
                  주변 병원 찾기
                </button>
              </div>
            )}
          </section>

          {selected && (
            <section className="rounded-3xl bg-white p-5 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold text-slate-800">{selected.label}</h2>
              <p className="mb-4 text-sm leading-relaxed text-slate-600">
                {selected.generalInfo}
              </p>

              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3">
                <p className="mb-1.5 text-sm font-semibold text-rose-900">
                  이런 증상이 함께 있으면 바로 응급실/119
                </p>
                <ul className="list-disc space-y-0.5 pl-4 text-xs text-rose-800">
                  {selected.redFlags.map((flag) => (
                    <li key={flag}>{flag}</li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => openNearbyMap(selected.mapQuery)}
                className="mt-4 w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white active:bg-slate-800"
              >
                주변 {selected.mapQuery} 찾기
              </button>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                지도 서비스의 검색 결과를 그대로 열어줄 뿐, 특정 병원을
                추천하지 않습니다.
              </p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
