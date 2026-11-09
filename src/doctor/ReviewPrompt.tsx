import { useState } from "react";
import { reviewVisit, type DoctorReview, type Visit } from "../visits/store";

const DEPTS = [
  "내과",
  "가정의학과",
  "정형외과",
  "신경과",
  "신경외과",
  "외과",
  "소화기내과",
  "안과",
  "이비인후과",
  "피부과",
  "산부인과",
  "소아청소년과",
  "비뇨의학과",
  "정신건강의학과",
  "재활의학과",
  "응급의학과",
  "치과",
  "한의원",
];

/**
 * "추천 과가 맞았나요?" — 의사가 한 번 눌러 남기는 라벨 정답.
 * 우리가 규칙을 바로잡는 근거가 되고, 의사에게는 "당신이 판단한다"는 통제권이다.
 */
export function ReviewPrompt({
  visit,
  recommended,
  onSaved,
}: {
  visit: Visit;
  recommended: string[];
  onSaved?: (updated: Visit) => void;
}) {
  const [saved, setSaved] = useState<DoctorReview | undefined>(visit.doctorReview);
  const [editing, setEditing] = useState(!visit.doctorReview);
  const [other, setOther] = useState(false);
  const [actualDept, setActualDept] = useState("");

  function save(review: Omit<DoctorReview, "at">) {
    const updated = reviewVisit(visit.id, review);
    setSaved(updated.doctorReview);
    setEditing(false);
    setOther(false);
    onSaved?.(updated);
  }

  if (saved && !editing) {
    return (
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--mist)] pt-2 text-[11px] text-[var(--ink-2)]">
        <span>
          의사 확인: {saved.verdict}
          {saved.verdict === "다른 과" && saved.actualDept ? ` → ${saved.actualDept}` : ""}
        </span>
        <button type="button" onClick={() => setEditing(true)} className="font-bold underline">
          바꾸기
        </button>
      </div>
    );
  }

  const btn =
    "min-h-[36px] rounded-xl border border-[var(--mist)] px-3 text-xs font-bold text-[var(--ink)] active:bg-[var(--mist)]";

  return (
    <div
      role="group"
      aria-label="추천 과가 맞았나요?"
      className="mt-3 border-t border-[var(--mist)] pt-2"
    >
      <p className="mb-1.5 text-[11px] font-semibold text-[var(--ink-2)]">
        추천 과({recommended.join(" · ") || "없음"})가 맞았나요? 한 번만 눌러 주세요 — 안내 규칙을 고치는 근거가
        돼요.
      </p>
      {!other ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn} onClick={() => save({ verdict: "맞음", recommended })}>
            맞음
          </button>
          <button type="button" className={btn} onClick={() => setOther(true)}>
            다른 과
          </button>
          <button type="button" className={btn} onClick={() => save({ verdict: "보류", recommended })}>
            판단 보류
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={`actual-${visit.id}`} className="sr-only">
            실제 진료과
          </label>
          <select
            id={`actual-${visit.id}`}
            value={actualDept}
            onChange={(e) => setActualDept(e.target.value)}
            className="min-h-[36px] rounded-xl border border-[var(--mist)] bg-[var(--paper)] px-2 text-xs text-[var(--ink)]"
          >
            <option value="">실제 진료과 선택</option>
            {DEPTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={btn}
            disabled={!actualDept}
            onClick={() => save({ verdict: "다른 과", actualDept, recommended })}
          >
            저장
          </button>
          <button type="button" onClick={() => setOther(false)} className="text-[11px] text-[var(--ink-2)] underline">
            취소
          </button>
        </div>
      )}
    </div>
  );
}
