import { useMemo } from "react";
import { listVisits } from "../visits/store";
import { localDateKey } from "../doctor/queue";
import { computeHospitalStats, formatSeconds } from "./dashboard";

/**
 * 병원 대시보드 — 병원이 돈을 낼 때 보는 숫자. 배지 로그인 뒤에만.
 * 이 기기 저장소의 방문 기록을 그대로 센다(시연). 표본이 없으면 "아직 데이터 없음".
 */
const NONE = "아직 데이터 없음";

export function DashboardPanel() {
  const stats = useMemo(() => computeHospitalStats(listVisits(), { today: localDateKey() }), []);
  const items: { label: string; value: string; sub?: string }[] = [
    {
      label: "문진 완료",
      value: stats.intakeCompleted > 0 ? `${stats.intakeCompleted}건` : NONE,
      sub: "말로 정리하고 예약한 방문",
    },
    {
      label: "평균 문진 소요",
      value: stats.avgIntakeSeconds !== null ? formatSeconds(stats.avgIntakeSeconds) : NONE,
      sub: "문진 시작부터 확인까지",
    },
    {
      label: "추천 일치율",
      value: stats.accuracy !== null ? `${stats.accuracy}%` : NONE,
      sub: stats.reviewed > 0 ? `의사 확인 ${stats.reviewed}건 기준` : "의사가 \"추천 과가 맞았나요?\"에 답하면",
    },
    {
      label: "예약 대비 방문",
      value: stats.visitRate !== null ? `${stats.visitRate}%` : NONE,
      sub: stats.bookedDue > 0 ? `오늘까지 예약 ${stats.bookedDue}건 중 ${stats.visited}건 진료` : "오늘까지 예약된 방문 기준",
    },
    {
      label: "서류 발급",
      value: stats.documentsIssued !== null ? `${stats.documentsIssued}건` : NONE,
      sub: "서류 발급 기능은 준비 중",
    },
  ];

  return (
    <section aria-labelledby="dash-h" className="mt-8">
      <div className="flex items-baseline justify-between">
        <h2 id="dash-h" className="text-base font-bold">병원 대시보드</h2>
        <span className="text-[11px] text-[var(--ink-2)]">시연 · 이 기기에 저장된 방문 기록 기준</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
        {items.map((it) => {
          const empty = it.value === NONE;
          return (
            <div key={it.label} className="rounded-2xl border border-[var(--mist)] bg-[var(--surface)] px-4 py-3">
              <dt className="text-[11px] font-bold text-[var(--ink-2)]">{it.label}</dt>
              <dd className={`mt-1 ${empty ? "text-sm font-bold text-[var(--ink-2)]/70" : "font-data text-2xl font-bold tracking-tight text-[var(--ink)]"}`}>
                {it.value}
              </dd>
              {it.sub && <dd className="mt-0.5 text-[10px] leading-relaxed text-[var(--ink-2)]">{it.sub}</dd>}
            </div>
          );
        })}
      </dl>
      <p className="mt-2 text-[11px] leading-relaxed text-[var(--ink-2)]">
        실사용 숫자가 아닙니다. 파일럿에서 같은 항목을 실제 환자로 재고, 그 숫자로 요금을 정합니다.
      </p>
    </section>
  );
}
