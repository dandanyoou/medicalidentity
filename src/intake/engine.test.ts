import { describe, it, expect } from "vitest";
import {
  EMPTY_ANSWERS,
  answer,
  buildRecord,
  currentQuestion,
  guessParts,
  summarize,
  undo,
  withJosa,
  type IntakeAnswers,
} from "./engine";

/** 질문 순서대로 답을 넣는다(테스트 도우미). */
function run(values: (string | string[] | number)[], start: IntakeAnswers = EMPTY_ANSWERS) {
  return values.reduce<IntakeAnswers>((a, v) => answer(a, v), start);
}

describe("withJosa — 받침에 맞는 조사", () => {
  it("받침 없으면 가/는, 있으면 이/은", () => {
    expect(withJosa("머리", "이/가")).toBe("머리가");
    expect(withJosa("다리·발", "이/가")).toBe("다리·발이");
    expect(withJosa("목·어깨", "은/는")).toBe("목·어깨는");
    expect(withJosa("배", "은/는")).toBe("배는");
    expect(withJosa("팔·손", "은/는")).toBe("팔·손은");
  });
});

describe("guessParts — 자유 문장에서 부위 미리 고르기", () => {
  it("'다리도 근데 좀 아프네', '어깨가 왜 뻐근하지'처럼 말이 끼어 있어도 부위를 찾는다", () => {
    expect(guessParts("머리가 아프고 다리도 근데 좀 아프네 그리고 어깨가 왜 뻐근하지?")).toEqual([
      "머리",
      "목·어깨",
      "다리·발",
    ]);
  });

  it("'속이 안 좋아'는 배로 본다", () => {
    expect(guessParts("어제부터 속이 안 좋아요")).toEqual(["배"]);
  });

  it("부위 단어가 없으면 빈 목록", () => {
    expect(guessParts("그냥 너무 피곤해요")).toEqual([]);
  });
});

describe("문진 질문 순서", () => {
  it("처음에는 어디가 불편한지(여러 개 선택) 묻는다", () => {
    const q = currentQuestion(EMPTY_ANSWERS)!;
    expect(q.step).toBe("parts");
    expect(q.multi).toBe(true);
    expect(q.options.map((o) => o.value)).toEqual(
      expect.arrayContaining(["머리", "목·어깨", "다리·발", "배", "가슴"]),
    );
  });

  it("2곳 이상 고르면 가장 불편한 곳을 한 번 더 묻고, 그곳의 느낌부터 묻는다", () => {
    const a = run([["머리", "다리·발"]]);
    const q = currentQuestion(a)!;
    expect(q.step).toBe("primary");
    expect(q.multi).toBe(false);
    expect(q.options.map((o) => o.value)).toEqual(["머리", "다리·발"]);
    const next = currentQuestion(answer(a, "다리·발"))!;
    expect(next.step).toBe("quality");
    expect(next.prompt).toContain("다리·발은");
  });

  it("1곳만 고르면 가장 불편한 곳을 묻지 않는다", () => {
    expect(currentQuestion(run([["머리"]]))!.step).toBe("quality");
  });

  it("고른 부위마다 느낌을 따로 묻고, 비유로 설명을 붙인다", () => {
    const a = run([["머리", "목·어깨"], "머리"]);
    const q1 = currentQuestion(a)!;
    expect(q1.step).toBe("quality");
    expect(q1.prompt).toContain("머리는");
    const throb = q1.options.find((o) => o.value === "욱신")!;
    expect(throb.label).toBe("욱신욱신");
    expect(throb.hint).toBe("맥박이 뛰듯 쿵쿵");
    // 설명하기 어려운 사람도 넘어갈 수 있다.
    expect(q1.options.some((o) => o.value === "모르겠음")).toBe(true);

    const q2 = currentQuestion(answer(a, "욱신"))!;
    expect(q2.step).toBe("quality");
    expect(q2.prompt).toContain("목·어깨는");
  });

  it("느낌 다음에는 시작 시점 → 아픈 정도 → 심해지는 때 → 같이 있는 증상 → 끝", () => {
    let a = run([["머리"], "욱신"]);
    const steps: string[] = [];
    const values: (string | string[] | number)[] = ["1-3일", 5, ["움직일 때"], ["없음"]];
    for (const v of values) {
      steps.push(currentQuestion(a)!.step);
      a = answer(a, v);
    }
    expect(steps).toEqual(["onset", "severity", "triggers", "associated"]);
    expect(currentQuestion(a)).toBeNull();
  });

  it("이전 질문으로 되돌리면 마지막 답만 지운다", () => {
    const a = run([["머리", "목·어깨"], "머리", "욱신", "뻐근"]);
    const back = undo(a);
    expect(back.quality).toEqual({ 머리: "욱신" });
    expect(currentQuestion(back)!.prompt).toContain("목·어깨는");
    expect(undo(undo(back)).primary).toBeUndefined();
    expect(undo(undo(undo(back))).parts).toBeUndefined();
  });
});

describe("buildRecord — 방문 기록에 항목별로 저장할 문진 기록", () => {
  it("고른 답을 항목별로 담고, 요약 문장과 덧붙인 말도 함께 둔다", () => {
    const a = run([["머리"], "욱신", "1-3일", 5, ["움직일 때"], ["없음"]]);
    const r = buildRecord(a, "  약을 먹어도 안 나아요 ", 1700000000000);
    expect(r).toEqual({
      parts: ["머리"],
      // 한 곳만 골랐으면 그곳이 가장 불편한 곳이다.
      primary: "머리",
      quality: { 머리: "욱신" },
      onset: "1-3일",
      severity: 5,
      triggers: ["움직일 때"],
      // "없음"도 남긴다 — 의사에게는 '없다고 답한 증상'도 정보다.
      associated: ["없음"],
      summary: summarize(a),
      note: "약을 먹어도 안 나아요",
      confirmedAt: 1700000000000,
    });
  });

  it("덧붙인 말이 비어 있으면 note를 두지 않는다", () => {
    const a = run([["배"], "쑤시는", "오늘", 2, ["특별히 없음"], ["없음"]]);
    expect(buildRecord(a, "   ", 1).note).toBeUndefined();
  });
});

describe("summarize — 의사에게 전달할 문장", () => {
  it("부위·느낌·시점·정도·심해지는 때·동반 증상을 한 문단으로 정리한다(병명은 쓰지 않는다)", () => {
    // 가장 불편한 곳(다리·발)을 맨 앞에 두고, 한 문장으로 짚어준다.
    const a = run([["머리", "목·어깨", "다리·발"], "다리·발", "모르겠음", "욱신", "뻐근", "1-3일", 5, ["움직일 때", "밤에·누우면"], ["없음"]]);
    expect(summarize(a)).toBe(
      "1~3일 전부터 다리·발이 불편하고, 머리가 욱신욱신 아프고, 목·어깨가 뻐근하고 결려요. 가장 불편한 곳은 다리·발이에요. 아픈 정도는 10점 중 5점(일상이 불편한 정도)이에요. 움직일 때·밤에·누우면 더 심해져요. 다른 증상은 없어요.",
    );
  });

  it("심해지는 때가 특별히 없고 동반 증상이 있으면 그대로 적는다", () => {
    const a = run([["배"], "쥐어짜는", "오늘", 7, ["특별히 없음"], ["열", "구토·메스꺼움"]]);
    expect(summarize(a)).toBe(
      "오늘부터 배가 쥐어짜듯 아파요. 아픈 정도는 10점 중 7점(일을 못 할 정도)이에요. 같이 있는 증상: 열, 구토·메스꺼움.",
    );
  });
});
