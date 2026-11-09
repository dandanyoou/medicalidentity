/**
 * 병원 시연용 환자 — 의사 화면만 열어도 대기열이 차 있게.
 *
 * 병원에서는 환자 폰과 의사 노트북이 저장소를 공유하지 않는다. 그래서 의사 화면에서
 * 오늘 예약 4명을 문진 기록까지 넣어 준다. 화면에는 "시연"으로 표시하고, 버튼 하나로
 * 지운다. 네 번째 환자는 위험 조합(가슴 + 숨이 참)이라 카드에 응급 안내가 뜬다.
 */
import { addVisit, listVisits, removeVisitsByIdPrefix } from "../visits/store";
import { EMPTY_ANSWERS, answer, buildRecord, summarize, type IntakeAnswers } from "../intake/engine";
import { recommendDepts } from "../intake/triage";
import { localDateKey } from "./queue";

export const DEMO_ID_PREFIX = "demo-";
export const DEMO_MEMBER_ID = "demo-patient";

interface DemoCase {
  no: number;
  name: string;
  time: string;
  hospital: string;
  /** 문진 질문 순서대로 고른 답. */
  answers: (string | string[] | number)[];
  note?: string;
}

const CASES: DemoCase[] = [
  {
    no: 1,
    name: "박영희",
    time: "09:30",
    hospital: "서울대학교병원",
    answers: [["머리", "목·어깨"], "머리", "욱신", "뻐근", "1-3일", 5, ["움직일 때"], ["없음"]],
    note: "진통제를 먹어도 그대로예요",
  },
  {
    no: 2,
    name: "이준호",
    time: "10:00",
    hospital: "서울대학교병원",
    answers: [["배"], "쥐어짜는", "오늘", 7, ["먹고 나서"], ["구토·메스꺼움"]],
    note: "어제 회를 먹었어요",
  },
  {
    no: 3,
    name: "최민서",
    time: "10:30",
    hospital: "서울대학교병원",
    answers: [["허리·등", "다리·발"], "허리·등", "묵직", "찌릿", "1주", 5, ["움직일 때", "밤에·누우면"], ["저림·감각 이상"]],
  },
  {
    no: 4,
    name: "김복순",
    time: "11:00",
    hospital: "서울대학교병원",
    answers: [["가슴"], "묵직", "오늘", 7, ["움직일 때"], ["숨이 참"]],
    note: "계단 오르면 숨이 차요",
  },
];

function runAnswers(values: (string | string[] | number)[]): IntakeAnswers {
  return values.reduce<IntakeAnswers>((a, v) => answer(a, v), EMPTY_ANSWERS);
}

export function hasDemoPatients(): boolean {
  return listVisits().some((v) => v.id.startsWith(DEMO_ID_PREFIX));
}

/** 오늘 날짜 시연 환자 4명을 넣는다. 다시 불러도 같은 id라 중복되지 않는다. */
export function seedDemoPatients(now: Date = new Date()): void {
  const date = localDateKey(now);
  for (const c of CASES) {
    const a = runAnswers(c.answers);
    const summary = summarize(a);
    const dept = recommendDepts(a)?.depts[0] ?? "가정의학과";
    addVisit({
      id: `${DEMO_ID_PREFIX}${c.no}`,
      memberId: DEMO_MEMBER_ID,
      patientName: c.name,
      hospital: c.hospital,
      dept,
      date,
      time: c.time,
      reason: summary,
      intake: buildRecord(a, c.note ?? "", now.getTime()),
      amount: 0,
      paid: false,
      status: "예약",
    });
  }
}

export function clearDemoPatients(): void {
  removeVisitsByIdPrefix(DEMO_ID_PREFIX);
}
