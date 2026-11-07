import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteDiaryEntry, listDiaryEntries, type DiaryEntry } from "./diary";
import { SYMPTOMS } from "../symptom-info/data";
import { openNearbyMap } from "../symptom-info/nearbyMap";

/** 저장된 태그(label)에서 진료과를 역으로 찾는다 — 중복 제거. */
function departmentsFor(tags: string[]): string[] {
  const depts = tags
    .map((tag) => SYMPTOMS.find((s) => s.label === tag)?.mapQuery)
    .filter((d): d is string => Boolean(d));
  return [...new Set(depts)];
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${d
    .getHours()
    .toString()
    .padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

/**
 * 증상 일기 보기 — 환자가 쓴 말을 그대로, 시간순으로 보여준다.
 *
 * 법적 경계: 여기서 "이 패턴을 보니 OO일 가능성이 높다" 같은 해석을
 * 만들어내지 않는다. 다음 병원에서 의료진에게 그대로 보여주는 용도다 —
 * 해석은 의료진의 몫으로 남긴다.
 */
export function SymptomDiaryScreen() {
  useEffect(() => {
    document.title = "증상 일기";
  }, []);

  const [entries, setEntries] = useState<DiaryEntry[]>(() => listDiaryEntries());

  function handleDelete(id: string) {
    deleteDiaryEntry(id);
    setEntries(listDiaryEntries());
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] md:px-6 md:py-10">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-[var(--paper)] shadow-xl md:max-w-2xl md:min-h-0 md:overflow-hidden md:rounded-3xl md:shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--mist)] bg-[var(--paper)]/92 px-4 py-3 backdrop-blur">
          <Link
            to="/wallet"
            aria-label="지갑으로 돌아가기"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink-2)] hover:bg-[var(--paper)]"
          >
            ‹
          </Link>
          <h1 className="text-base font-semibold text-[var(--ink)]">증상 일기</h1>
          <Link
            to="/symptom"
            className="ml-auto rounded-full bg-[var(--paper)] px-3 py-1.5 text-xs font-medium text-[var(--refund-ink)]"
          >
            + 새로 기록
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-8 pt-5">
          <div className="mb-4 rounded-2xl border border-[var(--mist)] bg-[var(--surface)] px-4 py-3 text-xs leading-relaxed text-[var(--ink-2)]">
            적어두신 내용을 그대로 시간순으로 보여드려요. 다음 병원에 갈 때
            이 화면을 의료진에게 직접 보여주시면 됩니다 — 저희가 해석을
            덧붙이지 않습니다.
          </div>

          {entries.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface)] p-6 text-center shadow-sm">
              <p className="text-sm text-[var(--ink-2)]">아직 기록된 증상이 없어요.</p>
              <Link
                to="/symptom"
                className="mt-3 inline-block rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-white"
              >
                첫 기록 남기기
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {entries.map((entry) => (
                <li key={entry.id} className="rounded-3xl bg-[var(--surface)] p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-[var(--ink-2)]">{formatDateTime(entry.createdAt)}</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      aria-label="이 기록 삭제"
                      className="text-xs text-[var(--ink-2)] underline"
                    >
                      삭제
                    </button>
                  </div>

                  <p className="mb-2 text-sm leading-relaxed text-[var(--ink)]">{entry.rawText}</p>

                  {entry.matchedTags.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {entry.matchedTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[var(--paper)] px-2.5 py-1 text-[11px] font-medium text-[var(--refund-ink)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {(entry.onset || entry.severity || entry.note) && (
                    <dl className="mb-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[var(--ink-2)]">
                      {entry.onset && (
                        <>
                          <dt className="text-[var(--ink-2)]">언제부터</dt>
                          <dd>{entry.onset}</dd>
                        </>
                      )}
                      {entry.severity && (
                        <>
                          <dt className="text-[var(--ink-2)]">강도(자가 평가)</dt>
                          <dd>{entry.severity} / 5</dd>
                        </>
                      )}
                      {entry.note && (
                        <>
                          <dt className="text-[var(--ink-2)]">메모</dt>
                          <dd>{entry.note}</dd>
                        </>
                      )}
                    </dl>
                  )}

                  {departmentsFor(entry.matchedTags).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {departmentsFor(entry.matchedTags).map((dept) => (
                        <button
                          key={dept}
                          type="button"
                          onClick={() => openNearbyMap(dept)}
                          className="rounded-full border border-[var(--mist)] px-3 py-1.5 text-xs font-medium text-[var(--ink-2)] active:bg-[var(--paper)]"
                        >
                          주변 {dept} 찾기
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </div>
  );
}
