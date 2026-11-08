/**
 * 진료 방문(Visit) — 예약·수납·진료기록을 하나로 묶는 뼈대.
 *
 * 방문 한 건이 {병원·진료과·날짜·방문이유·소견서·처방전·진료비·수납여부}를 들고
 * 있다. 예약 = 방문 생성(status 예약), 수납 = 미납 방문 결제(수납대기→완료),
 * 진료기록 = 그 방문의 상세(소견서·처방전).
 *
 * 정직: 소견서·처방전·금액은 실제 병원/EMR·전자처방전 연동 전까지는 데모
 * 데이터다. 실제 연동 시 이 자리에 병원이 보낸 실제 문서가 들어온다.
 */

const KEY = "medid.visits.v1";

export type VisitStatus = "예약" | "수납대기" | "완료";

export interface Prescription {
  drug: string;
  dose: string;
  days: number;
}

export interface Visit {
  id: string;
  memberId: string;
  hospital: string;
  dept: string;
  date: string; // YYYY-MM-DD
  reason: string; // 방문 이유(증상)
  opinion?: string; // 소견서
  prescriptions?: Prescription[];
  amount: number; // 진료비(원)
  paid: boolean;
  status: VisitStatus;
}

// 본인 데모 진료기록 — 수납/기록 화면에 내용이 있게 시드한다.
const SEED: Visit[] = [
  {
    id: "v-seed-1",
    memberId: "self",
    hospital: "서울대학교병원",
    dept: "신경과",
    date: "2026-11-05",
    reason: "3일째 지속되는 두통, 빛에 예민함",
    opinion:
      "긴장성 두통으로 추정. 신경학적 이상 소견 없음. 수분·휴식 권고, 2주 내 호전 없으면 재내원.",
    prescriptions: [
      { drug: "아세트아미노펜(타이레놀) 500mg", dose: "1정 3회/일", days: 3 },
    ],
    amount: 38400,
    paid: false,
    status: "수납대기",
  },
  {
    id: "v-seed-2",
    memberId: "self",
    hospital: "분당서울대학교병원",
    dept: "정형외과",
    date: "2026-10-28",
    reason: "오른쪽 무릎 통증, 계단 오를 때 심함",
    opinion:
      "퇴행성 무릎 관절 변화 초기. X-ray상 경미한 관절 간격 감소. 물리치료 및 체중관리 권고.",
    prescriptions: [
      { drug: "세레콕시브 200mg", dose: "1정 1회/일", days: 14 },
      { drug: "아세클로페낙 100mg", dose: "1정 2회/일", days: 7 },
    ],
    amount: 52100,
    paid: false,
    status: "수납대기",
  },
  {
    id: "v-seed-3",
    memberId: "self",
    hospital: "서울대학교병원",
    dept: "내과",
    date: "2026-09-14",
    reason: "정기 건강검진 후 혈압 상담",
    opinion: "경계성 고혈압. 생활습관 개선 우선, 3개월 후 재측정. 투약은 보류.",
    prescriptions: [],
    amount: 21000,
    paid: true,
    status: "완료",
  },
];

const STATUSES: readonly VisitStatus[] = ["예약", "수납대기", "완료"];

function isVisit(v: unknown): v is Visit {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.memberId === "string" &&
    typeof o.hospital === "string" &&
    typeof o.dept === "string" &&
    typeof o.date === "string" &&
    typeof o.reason === "string" &&
    typeof o.amount === "number" &&
    Number.isFinite(o.amount) &&
    typeof o.paid === "boolean" &&
    STATUSES.includes(o.status as VisitStatus)
  );
}

function read(): Visit[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [...SEED];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...SEED];
    // 형태가 깨진 항목 하나 때문에 화면 전체가 죽거나 "NaN원"이 뜨지 않게 걸러낸다.
    return parsed.filter(isVisit);
  } catch {
    return [...SEED];
  }
}

function write(visits: Visit[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(visits));
  } catch {
    /* 저장 실패는 조용히 무시 */
  }
}

/** 방문 목록(최신순). memberId를 주면 그 구성원 것만. */
export function listVisits(memberId?: string): Visit[] {
  const all = read().sort((a, b) => (a.date < b.date ? 1 : -1));
  return memberId ? all.filter((v) => v.memberId === memberId) : all;
}

export function getVisit(id: string): Visit | undefined {
  return read().find((v) => v.id === id);
}

/**
 * 미납 = 진료를 받고 수납을 기다리는 방문(status "수납대기").
 * 예약(진료 전)은 paid가 false여도 미납이 아니다 — 홈·수납 화면이 이 한 규칙을 쓴다.
 */
export function isUnpaid(v: Visit): boolean {
  return v.status === "수납대기";
}

export function unpaidVisits(memberId?: string): Visit[] {
  return listVisits(memberId).filter(isUnpaid);
}

export function addVisit(input: Omit<Visit, "id">): Visit {
  const visit: Visit = {
    ...input,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `visit_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  };
  write([visit, ...read()]);
  return visit;
}

export function payVisit(id: string): void {
  write(
    read().map((v) =>
      v.id === id ? { ...v, paid: true, status: "완료" as VisitStatus } : v,
    ),
  );
}

/** 테스트·초기화용 — 시드 상태로 되돌린다. */
export function resetVisits(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}
