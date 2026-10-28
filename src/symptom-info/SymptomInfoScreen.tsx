import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { searchSymptoms, type SymptomEntry } from "./data";
import { openNearbyMap } from "./nearbyMap";
import { addDiaryEntry, DiarySaveError } from "../wallet/diary";

const SEVERITY_LEVELS = [1, 2, 3, 4, 5] as const;

/**
 * 증상 정보 + 주변 병원·약국 찾기.
 *
 * 법적 경계(중요): 이 화면은 "병원을 추천"하지 않는다. 지도 서비스의 검색
 * 결과를 그대로 열어줄 뿐이고, 어떤 병원이 더 낫다는 판단을 내리지 않는다.
 * 증상 정보도 일반적인 공공보건 수준 참고용이며 진단이 아니다 — data.ts의
 * 주석 참고. 자유 텍스트 입력이어도 콘텐츠는 지어내지 않는다: 매칭 실패 시
 * 솔직하게 "등록된 정보가 없다"고 말한다(아래 generic fallback).
 */

export function SymptomInfoScreen() {
  useEffect(() => {
    document.title = "증상 정보 — 참고용";
  }, []);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SymptomEntry | null>(null);
  const [onset, setOnset] = useState("");
  const [severity, setSeverity] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const matches = useMemo(() => searchSymptoms(query), [query]);
  const noMatch = query.trim().length > 0 && matches.length === 0 && !selected;

  function handleSelect(entry: SymptomEntry) {
    setSelected(entry);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setSelected(null);
    setSaved(false);
  }

  function handleSaveToDiary() {
    setSaveError(null);
    try {
      // 선택한 항목 하나가 아니라, 문장 안에서 찾은 태그를 전부 같이
      // 저장한다("두통 + 메스꺼움"처럼 복합 증상을 한 기록으로 남기기 위함).
      addDiaryEntry({
        rawText: query.trim(),
        matchedTags: matches.map((m) => m.label),
        onset: onset.trim() || undefined,
        severity: severity ?? undefined,
        note: note.trim() || undefined,
      });
      setSaved(true);
    } catch (e) {
      // "저장됐어요"라고 조용히 거짓말하는 대신, 실패를 그대로 보여준다
      // (저장공간 초과 등 — diary.ts의 DiarySaveError 참고).
      setSaveError(
        e instanceof DiarySaveError ? e.message : "저장에 실패했습니다. 다시 시도해주세요.",
      );
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 md:px-6 md:py-10">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-slate-50 shadow-xl md:max-w-2xl md:min-h-0 md:overflow-hidden md:rounded-3xl md:shadow-2xl">
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
              어떻게 아프신지 편하게 적어보세요
            </label>
            <textarea
              id="symptom-input"
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              placeholder="예: 어제 저녁부터 머리가 아프고 속이 메스꺼워요"
              rows={3}
              className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-600"
            />
            <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
              문장 안에서 등록된 증상 단어를 찾아드려요 — 아직 모든 표현을
              완벽히 이해하진 못해요. 못 찾으면 아래에서 솔직하게 말씀드려요.
            </p>

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

              <p className="mt-4 text-sm text-slate-600">
                이런 증상은 보통 <strong className="text-slate-800">{selected.mapQuery}</strong>{" "}
                전문의가 진료합니다.
              </p>
              {matches.length > 1 && (
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  지금처럼 여러 증상이 같이 있다면, 특정 전문과보다 내과·
                  가정의학과에서 먼저 전체적으로 보고 필요하면 전문과로
                  안내받는 것도 좋은 방법이에요 — 증상이 겹치면 원인도
                  한 가지가 아닐 수 있습니다.
                </p>
              )}
              <button
                type="button"
                onClick={() => openNearbyMap(selected.mapQuery)}
                className="mt-2 w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white active:bg-slate-800"
              >
                주변 {selected.mapQuery} 찾기
              </button>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                진료과만 안내해드려요 — 지도 검색 결과를 그대로 열어줄 뿐,
                저희가 특정 병원을 골라서 추천하지 않습니다.
              </p>
            </section>
          )}

          {query.trim().length > 0 && (
            <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
              <h2 className="mb-1 text-sm font-semibold text-slate-800">증상 일기에 저장</h2>
              <p className="mb-3 text-xs leading-relaxed text-slate-400">
                적으신 내용을 그대로 저장해둬요. 다음에 다른 병원에 가서 또
                설명하지 않아도 되게, 그 병원에서 이 기록을 보여주시면 됩니다.
              </p>

              <label className="mb-3 block" htmlFor="symptom-onset">
                <span className="mb-1 block text-xs font-medium text-slate-500">언제부터인가요?</span>
                <input
                  id="symptom-onset"
                  type="text"
                  value={onset}
                  onChange={(event) => {
                    setOnset(event.target.value);
                    setSaved(false);
                  }}
                  placeholder="예: 어제 저녁부터"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-600"
                />
              </label>

              <div className="mb-3">
                <span className="mb-1 block text-xs font-medium text-slate-500">
                  어느 정도인가요? (본인 느낌으로)
                </span>
                <div className="flex gap-2">
                  {SEVERITY_LEVELS.map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => {
                        setSeverity(level);
                        setSaved(false);
                      }}
                      aria-pressed={severity === level}
                      className={`h-9 w-9 rounded-full text-sm font-semibold transition ${
                        severity === level
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <label className="mb-4 block" htmlFor="symptom-note">
                <span className="mb-1 block text-xs font-medium text-slate-500">
                  더 적어두고 싶은 내용(선택)
                </span>
                <input
                  id="symptom-note"
                  type="text"
                  value={note}
                  onChange={(event) => {
                    setNote(event.target.value);
                    setSaved(false);
                  }}
                  placeholder="예: 빛을 보면 더 아파요"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-600"
                />
              </label>

              {saveError && (
                <p role="alert" className="mb-2 rounded-2xl bg-rose-50 px-4 py-3 text-xs text-rose-700">
                  {saveError}
                </p>
              )}

              {saved ? (
                <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <span>일기에 저장됐어요.</span>
                  <Link to="/diary" className="font-semibold underline">
                    일기 보기
                  </Link>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveToDiary}
                  className="w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white active:bg-slate-800"
                >
                  증상 일기에 저장
                </button>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
