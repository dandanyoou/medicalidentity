import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  listRecords,
  computeMetrics,
  exportCSV,
  exportJSONL,
  clearRecords,
  type LabeledRecord,
} from "./store";

/**
 * 라벨링 대시보드 — 수집된 "실사용자 자유서술 → 검증 라벨" 데이터셋의 현황과
 * 품질을 보여주고, CSV/JSONL로 내보낸다. 이 내보내기가 office-hours 과제의
 * "50행 샘플"(영업용 데이터 자산)을 만드는 도구다.
 */
function download(filename: string, content: string, mime: string) {
  try {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    // 다운로드를 지원하지 않는 환경(테스트 등)에서는 조용히 무시.
  }
}

export function LabelsDashboard() {
  useEffect(() => {
    document.title = "라벨링 현황 — 의료 데이터셋";
  }, []);

  const [records, setRecords] = useState<LabeledRecord[]>(() => listRecords());
  const metrics = useMemo(() => computeMetrics(records), [records]);
  const verifyRate =
    metrics.total > 0 ? Math.round((metrics.verified / metrics.total) * 100) : 0;
  const topTags = useMemo(
    () =>
      Object.entries(metrics.tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
    [metrics],
  );
  const maxTag = topTags.length > 0 ? topTags[0][1] : 1;

  return (
    <div className="min-h-screen bg-[var(--paper)] md:px-6 md:py-10">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-[var(--paper)] md:max-w-xl md:min-h-0 md:overflow-hidden md:rounded-[32px] md:shadow-[0_8px_60px_rgba(11,59,60,0.14)]">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--mist)] bg-[var(--paper)]/92 px-4 py-3 backdrop-blur">
          <Link
            to="/wallet"
            aria-label="지갑으로 돌아가기"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink-2)] hover:bg-[var(--surface)]"
          >
            ‹
          </Link>
          <h1 className="text-base font-semibold text-[var(--ink)]">라벨링 현황</h1>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-8 pt-5">
          <p className="mb-4 rounded-2xl border-l-4 border-[var(--ink)] bg-[var(--surface)] px-4 py-3 text-xs leading-relaxed text-[var(--ink-2)]">
            증상 화면에서 사용자가 확인·교정한 라벨이 여기에 쌓입니다. AI Hub 같은
            공개 데이터엔 없는 "실사용자 자유서술 → 검증 라벨" 쌍이에요. 내보낸
            파일을 외부에 공유하기 전에는 개인정보(이름·날짜 등)를 반드시
            비식별하세요.
          </p>

          {metrics.total === 0 ? (
            <div className="rounded-3xl bg-[var(--surface)] p-8 text-center text-sm text-[var(--ink-2)] shadow-[0_1px_12px_rgba(11,59,60,0.07)]">
              아직 수집된 라벨이 없어요.
              <Link to="/symptom" className="mt-2 block font-semibold text-[var(--refund-ink)] underline">
                증상 화면에서 첫 라벨 만들기 →
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
                  <div className="text-lg font-bold text-[var(--ink)]">총 {metrics.total}건</div>
                  <div className="text-[11px] text-[var(--ink-2)]">수집량</div>
                </div>
                <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
                  <div className="text-lg font-bold text-[var(--refund-ink)]">검증 {metrics.verified}건</div>
                  <div className="text-[11px] text-[var(--ink-2)]">{verifyRate}% 검증률</div>
                </div>
                <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
                  <div className="text-lg font-bold text-[var(--ink-2)]">자동 {metrics.autoOnly}건</div>
                  <div className="text-[11px] text-[var(--ink-2)]">미검증</div>
                </div>
              </div>

              {topTags.length > 0 && (
                <section className="mb-4 rounded-3xl bg-white p-5 shadow-sm">
                  <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">태그 분포</h2>
                  <div className="flex flex-col gap-2">
                    {topTags.map(([tag, count]) => (
                      <div key={tag} className="flex items-center gap-2">
                        <span className="w-20 flex-none truncate text-xs text-[var(--ink-2)]">{tag}</span>
                        <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--mist)]">
                          <div
                            className="h-full rounded-full bg-[var(--ink)]"
                            style={{ width: `${Math.round((count / maxTag) * 100)}%` }}
                          />
                        </div>
                        <span className="w-6 flex-none text-right text-xs text-[var(--ink-2)]">{count}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    download("medical-labels.csv", exportCSV(records), "text/csv")
                  }
                  className="flex-1 rounded-full bg-[var(--ink)] py-3 text-sm font-bold text-white active:brightness-110"
                >
                  CSV 내보내기
                </button>
                <button
                  type="button"
                  onClick={() =>
                    download(
                      "medical-labels.jsonl",
                      exportJSONL(records),
                      "application/x-ndjson",
                    )
                  }
                  className="flex-1 rounded-full bg-[var(--ink)] py-3 text-sm font-bold text-white active:brightness-110"
                >
                  JSONL 내보내기
                </button>
              </div>

              <section className="rounded-3xl bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[var(--ink)]">최근 레코드</h2>
                  <button
                    type="button"
                    onClick={() => {
                      clearRecords();
                      setRecords([]);
                    }}
                    className="text-xs text-[var(--ink-2)] underline"
                  >
                    전체 삭제
                  </button>
                </div>
                <ul className="flex flex-col gap-2">
                  {records.slice(0, 20).map((r) => (
                    <li key={r.id} className="rounded-2xl bg-[var(--paper)] px-3 py-2">
                      <p className="text-sm text-[var(--ink)]">{r.rawText}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {[...r.confirmedTags, ...r.addedTags].map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-[var(--refund)]/12 px-2 py-0.5 font-data text-[10px] font-bold text-[var(--refund-ink)]"
                          >
                            {t}
                          </span>
                        ))}
                        {r.rejectedTags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-[var(--vital)]/12 px-2 py-0.5 font-data text-[10px] font-bold text-[var(--vital-ink)] line-through"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
