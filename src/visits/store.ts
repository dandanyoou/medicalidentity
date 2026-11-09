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

import type { IntakeRecord } from "../intake/engine";

const KEY = "medid.visits.v1";

export type VisitStatus = "예약" | "수납대기" | "완료";

export interface Prescription {
  drug: string;
  dose: string;
  days: number;
}

/** 의사가 남기는 "추천 진료과가 맞았나" — 라벨링의 정답 데이터. */
export interface DoctorReview {
  verdict: "맞음" | "다른 과" | "보류";
  /** verdict가 "다른 과"일 때 실제로 봐야 했던 과. */
  actualDept?: string;
  /** 그때 앱이 보여준 추천 진료과(1순위부터). */
  recommended: string[];
  at: number;
}

const VERDICTS: readonly DoctorReview["verdict"][] = ["맞음", "다른 과", "보류"];

export interface Visit {
  id: string;
  memberId: string;
  /** 회원이 아닌 환자(시연 환자 등)의 표시 이름. 회원이면 가족 저장소 이름을 쓴다. */
  patientName?: string;
  hospital: string;
  dept: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM — 예약 시각(의사 대기열 정렬용)
  reason: string; // 방문 이유(증상)
  intake?: IntakeRecord; // 대화형 문진 답(항목별) — 의사 사전 문진 카드용
  doctorReview?: DoctorReview; // 의사가 남긴 추천 진료과 적합 여부
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
    (o.patientName === undefined || typeof o.patientName === "string") &&
    typeof o.hospital === "string" &&
    typeof o.dept === "string" &&
    typeof o.date === "string" &&
    (o.time === undefined || typeof o.time === "string") &&
    typeof o.reason === "string" &&
    typeof o.amount === "number" &&
    Number.isFinite(o.amount) &&
    typeof o.paid === "boolean" &&
    STATUSES.includes(o.status as VisitStatus)
  );
}

const isStringArray = (x: unknown): x is string[] =>
  Array.isArray(x) && x.every((s) => typeof s === "string");

function isIntakeRecord(v: unknown): v is IntakeRecord {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    isStringArray(o.parts) &&
    (o.primary === undefined || typeof o.primary === "string") &&
    !!o.quality &&
    typeof o.quality === "object" &&
    isStringArray(o.triggers) &&
    isStringArray(o.associated) &&
    typeof o.summary === "string" &&
    (o.severity === undefined || typeof o.severity === "number") &&
    (o.note === undefined || typeof o.note === "string") &&
    typeof o.confirmedAt === "number"
  );
}

function isDoctorReview(v: unknown): v is DoctorReview {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    VERDICTS.includes(o.verdict as DoctorReview["verdict"]) &&
    (o.actualDept === undefined || typeof o.actualDept === "string") &&
    isStringArray(o.recommended) &&
    typeof o.at === "number"
  );
}

/** 문진·의사 확인 기록이 깨졌으면 방문은 살리고 그 기록만 뺀다(방문·수납 기록이 더 중요하다). */
function sanitize(v: Visit): Visit {
  let out = v;
  if (out.intake !== undefined && !isIntakeRecord(out.intake)) {
    const { intake: _broken, ...rest } = out;
    out = rest;
  }
  if (out.doctorReview !== undefined && !isDoctorReview(out.doctorReview)) {
    const { doctorReview: _broken, ...rest } = out;
    out = rest;
  }
  return out;
}

function read(): Visit[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [...SEED];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...SEED];
    // 형태가 깨진 항목 하나 때문에 화면 전체가 죽거나 "NaN원"이 뜨지 않게 걸러낸다.
    return parsed.filter(isVisit).map(sanitize);
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

/** id를 주면 그대로 쓴다(시연 환자처럼 고정 id가 필요할 때). 같은 id가 있으면 덮어쓴다. */
export function addVisit(input: Omit<Visit, "id"> & { id?: string }): Visit {
  const visit: Visit = {
    ...input,
    id:
      input.id ??
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `visit_${Date.now()}_${Math.random().toString(36).slice(2)}`),
  };
  if (input.id) {
    write([visit, ...read().filter((v) => v.id !== input.id)]);
    return visit;
  }
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

/**
 * 진료 완료 — 의사가 소견·처방·진료비를 넣으면 예약이 수납대기가 된다.
 * 수납(payVisit)은 환자 쪽에서 따로 한다. 진료비는 0 이상의 정수만 받는다.
 */
export function completeVisit(
  id: string,
  input: { opinion: string; prescriptions: Prescription[]; amount: number },
): Visit {
  if (!Number.isInteger(input.amount) || input.amount < 0) {
    throw new Error("진료비는 0 이상의 정수여야 해요");
  }
  const target = read().find((v) => v.id === id);
  if (!target) throw new Error("방문을 찾을 수 없어요");
  const updated: Visit = {
    ...target,
    opinion: input.opinion.trim(),
    prescriptions: input.prescriptions,
    amount: input.amount,
    paid: false,
    status: "수납대기",
  };
  write(read().map((v) => (v.id === id ? updated : v)));
  return updated;
}

/** 의사 확인(추천 진료과 적합 여부)을 남긴다. 다시 누르면 덮어쓴다. */
export function reviewVisit(
  id: string,
  review: Omit<DoctorReview, "at">,
  at: number = Date.now(),
): Visit {
  const target = read().find((v) => v.id === id);
  if (!target) throw new Error("방문을 찾을 수 없어요");
  const updated: Visit = { ...target, doctorReview: { ...review, at } };
  write(read().map((v) => (v.id === id ? updated : v)));
  return updated;
}

/** id 접두어로 방문을 지운다(시연 환자 정리). */
export function removeVisitsByIdPrefix(prefix: string): void {
  write(read().filter((v) => !v.id.startsWith(prefix)));
}

/** 테스트·초기화용 — 시드 상태로 되돌린다. */
export function resetVisits(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}
