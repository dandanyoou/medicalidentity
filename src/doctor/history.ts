import type { Visit } from "../visits/store";

/**
 * 과거 진료 이력 — 같은 환자의 지난 방문 소견·처방(R6).
 *
 * 같은 사람인지는 memberId로 보고, 회원이 아닌 환자(시연 환자처럼 memberId를 공유하고
 * patientName으로 구분)는 이름까지 같아야 한다. 진료를 마친 방문만(예약 상태는 제외),
 * 현재 방문보다 앞선 날짜만, 최근 순. 의사 화면 원칙대로 소견은 적힌 그대로 보여주고
 * 요약·해석을 더하지 않는다.
 */
function samePatient(a: Visit, b: Visit): boolean {
  if (a.memberId !== b.memberId) return false;
  if (a.patientName || b.patientName) return a.patientName === b.patientName;
  return true;
}

function sortKey(v: Visit): string {
  return `${v.date} ${v.time ?? "00:00"}`;
}

export function pastVisits(all: Visit[], current: Visit, limit = 5): Visit[] {
  return all
    .filter((v) => v.id !== current.id && samePatient(v, current) && v.status !== "예약" && v.date < current.date)
    .sort((a, b) => (sortKey(a) < sortKey(b) ? 1 : -1))
    .slice(0, limit);
}

export interface HistoryLine {
  id: string;
  date: string;
  hospital: string;
  dept: string;
  opinion: string;
  drugs: string[];
}

export function historyLine(v: Visit): HistoryLine {
  return {
    id: v.id,
    date: v.date,
    hospital: v.hospital,
    dept: v.dept,
    opinion: (v.opinion ?? "").trim(),
    drugs: (v.prescriptions ?? []).map((p) => p.drug),
  };
}
