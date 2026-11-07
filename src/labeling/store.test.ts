// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addRecord,
  listRecords,
  clearRecords,
  computeMetrics,
  exportCSV,
  exportJSONL,
  LabelStoreError,
  type LabeledRecord,
} from "./store";

afterEach(() => {
  clearRecords();
  vi.restoreAllMocks();
});

function rec(partial: Partial<Omit<LabeledRecord, "id" | "createdAt">> = {}) {
  return {
    rawText: partial.rawText ?? "머리가 아프고 속이 메스꺼워요",
    autoTags: partial.autoTags ?? ["두통", "메스꺼움"],
    confirmedTags: partial.confirmedTags ?? [],
    rejectedTags: partial.rejectedTags ?? [],
    addedTags: partial.addedTags ?? [],
  };
}

describe("labeling store", () => {
  it("addRecord는 id·createdAt을 붙여 저장하고 listRecords로 돌려준다", () => {
    const saved = addRecord(rec({ confirmedTags: ["두통"] }));
    expect(saved.id).toBeTruthy();
    expect(typeof saved.createdAt).toBe("number");
    const all = listRecords();
    expect(all).toHaveLength(1);
    expect(all[0].rawText).toContain("머리가 아프고");
    expect(all[0].confirmedTags).toEqual(["두통"]);
  });

  it("저장 실패 시 조용히 성공하지 않고 LabelStoreError를 던진다", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceeded");
    });
    expect(() => addRecord(rec())).toThrow(LabelStoreError);
  });

  it("computeMetrics: 검증률과 태그 분포를 센다", () => {
    addRecord(rec({ confirmedTags: ["두통"], addedTags: ["어지럼"] })); // verified
    addRecord(rec({ rejectedTags: ["메스꺼움"] })); // verified
    addRecord(rec({ confirmedTags: [], rejectedTags: [] })); // auto-only
    const m = computeMetrics(listRecords());
    expect(m.total).toBe(3);
    expect(m.verified).toBe(2);
    expect(m.autoOnly).toBe(1);
    expect(m.tagCounts["두통"]).toBe(1);
    expect(m.tagCounts["어지럼"]).toBe(1);
  });

  it("exportCSV: 헤더 + 콤마/따옴표가 든 rawText를 안전하게 이스케이프", () => {
    const records: LabeledRecord[] = [
      {
        id: "a1",
        createdAt: 0,
        rawText: '머리, "콕콕" 아파요',
        autoTags: ["두통"],
        confirmedTags: ["두통"],
        rejectedTags: [],
        addedTags: [],
      },
    ];
    const csv = exportCSV(records);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toContain("rawText");
    // 콤마·따옴표가 있으면 따옴표로 감싸고 내부 따옴표는 두 번.
    expect(lines[1]).toContain('"머리, ""콕콕"" 아파요"');
  });

  it("exportJSONL: 레코드당 한 줄 JSON, labels = confirmed + added", () => {
    const records: LabeledRecord[] = [
      {
        id: "a1",
        createdAt: 0,
        rawText: "다리가 아파요",
        autoTags: ["다리 통증"],
        confirmedTags: ["다리 통증"],
        rejectedTags: [],
        addedTags: ["무릎 통증"],
      },
    ];
    const jsonl = exportJSONL(records);
    const lines = jsonl.trim().split("\n");
    expect(lines).toHaveLength(1);
    const obj = JSON.parse(lines[0]);
    expect(obj.text).toBe("다리가 아파요");
    expect(obj.labels).toEqual(["다리 통증", "무릎 통증"]);
  });
});
