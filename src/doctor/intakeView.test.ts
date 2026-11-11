import { describe, it, expect } from "vitest";
import { intakeView } from "./intakeView";
import { EMPTY_ANSWERS, answer, buildRecord, type IntakeAnswers } from "../intake/engine";

function run(values: (string | string[] | number)[]) {
  return values.reduce<IntakeAnswers>((a, v) => answer(a, v), EMPTY_ANSWERS);
}

describe("intakeView — 의사 카드에 보여줄 문진 항목", () => {
  const record = buildRecord(
    run([["머리", "다리·발"], "다리·발", "모르겠음", "욱신", "1-3일", 5, ["움직일 때"], ["없음"]]),
    "계단 오를 때 특히 아파요",
    1,
  );
  const v = intakeView(record);

  it("가장 불편한 곳을 따로 짚고, 부위는 그곳부터 환자가 고른 느낌(비유)과 함께", () => {
    expect(v.primary).toBe("다리·발");
    expect(v.parts).toEqual([
      { part: "다리·발", feeling: "잘 모르겠어요", hint: "괜찮아요, 넘어가도 돼요" },
      { part: "머리", feeling: "욱신욱신", hint: "맥박이 뛰듯 쿵쿵" },
    ]);
  });

  it("시작 시점·아픈 정도·심해지는 때를 읽기 쉬운 말로", () => {
    expect(v.onset).toBe("1~3일 전");
    expect(v.severity).toBe("5/10 · 일상이 불편한 정도");
    expect(v.triggers).toEqual(["움직일 때"]);
  });

  it("'없음'으로 답하면 물어본 동반 증상을 모두 '없다고 답함'으로 보여준다", () => {
    expect(v.associated).toEqual([]);
    expect(v.denied).toEqual(["열", "구토·메스꺼움", "어지러움", "저림·감각 이상", "숨이 참"]);
  });

  it("환자가 직접 쓴 말은 그대로", () => {
    expect(v.note).toBe("계단 오를 때 특히 아파요");
  });

  it("동반 증상을 골랐으면 고른 것만, 없다고 답한 목록은 비운다", () => {
    const r = buildRecord(run([["배"], "쥐어짜는", "오늘", 7, ["특별히 없음"], ["열"]]), "", 1);
    const w = intakeView(r);
    expect(w.associated).toEqual(["열"]);
    expect(w.denied).toEqual([]);
    expect(w.triggers).toEqual([]);
    expect(w.primary).toBe("배");
  });
});
