// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDiaryEntry, deleteDiaryEntry, DiarySaveError, listDiaryEntries, loadDiary } from "./diary";

describe("증상 일기 저장소", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("빈 상태에서는 빈 배열을 돌려준다", () => {
    expect(loadDiary()).toEqual([]);
  });

  it("항목을 추가하면 저장되고 id/시각이 자동으로 채워진다", () => {
    const entry = addDiaryEntry({
      rawText: "머리가 아프고 속이 메스꺼워요",
      matchedTags: ["두통", "메스꺼움"],
    });
    expect(entry.id).toBeTruthy();
    expect(entry.createdAt).toBeTruthy();
    expect(loadDiary()).toHaveLength(1);
  });

  it("환자가 쓴 원문을 그대로 보존한다(해석·수정 없음)", () => {
    const rawText = "어제부터 왼쪽 머리만 콕콕 쑤시고 빛보면 더 아파요";
    addDiaryEntry({ rawText, matchedTags: [] });
    expect(loadDiary()[0].rawText).toBe(rawText);
  });

  it("최신순으로 정렬해서 보여준다", () => {
    addDiaryEntry({ rawText: "첫번째", matchedTags: [] });
    addDiaryEntry({ rawText: "두번째", matchedTags: [] });
    const entries = listDiaryEntries();
    expect(entries[0].rawText).toBe("두번째");
    expect(entries[1].rawText).toBe("첫번째");
  });

  it("항목을 삭제할 수 있다", () => {
    const entry = addDiaryEntry({ rawText: "삭제될 항목", matchedTags: [] });
    deleteDiaryEntry(entry.id);
    expect(loadDiary()).toHaveLength(0);
  });

  it("손상된 저장값은 조용히 빈 목록으로 처리한다(과거 데이터 복구보다 안전)", () => {
    localStorage.setItem("symptom_diary_v1", "{not valid json");
    expect(loadDiary()).toEqual([]);
  });

  it("저장공간이 가득 차면(QuotaExceededError) '저장됐다'고 거짓말하지 않고 DiarySaveError를 던진다", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });

    expect(() => addDiaryEntry({ rawText: "저장 안 될 항목", matchedTags: [] })).toThrow(
      DiarySaveError,
    );

    spy.mockRestore();
  });

  it("crypto.randomUUID가 없는 환경에서도 저장은 계속된다(대체 ID 사용)", () => {
    const original = crypto.randomUUID;
    // @ts-expect-error — 구형 환경 시뮬레이션
    crypto.randomUUID = undefined;

    const entry = addDiaryEntry({ rawText: "구형 브라우저 테스트", matchedTags: [] });
    expect(entry.id).toBeTruthy();
    expect(loadDiary()).toHaveLength(1);

    crypto.randomUUID = original;
  });
});
