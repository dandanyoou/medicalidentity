/**
 * 의료 증상 라벨링 데이터 스토어.
 *
 * 사용자가 자유 텍스트로 증상을 쓰면 searchSymptoms가 자동 태그(weak label)를
 * 붙인다. 이 모듈은 사용자가 그 태그를 확인·교정한 "검증 라벨"을 레코드로
 * 모은다 — AI Hub 같은 공개 데이터엔 없는 "실사용자 자유서술 → 검증 라벨" 쌍.
 *
 * 레코드는 기기 로컬(localStorage)에만 저장된다. 내보내기(CSV/JSONL)는 사용자가
 * 직접 실행하며, 외부 공유 전 비식별은 사용자 책임(대시보드에 고지).
 */

const KEY = "medid.labels.v1";

export interface LabeledRecord {
  id: string;
  rawText: string;
  /** searchSymptoms가 자동으로 붙인 태그(label). */
  autoTags: string[];
  /** 사용자가 "맞아요"로 확인한 태그. */
  confirmedTags: string[];
  /** 사용자가 "아니에요"로 거부한 태그. */
  rejectedTags: string[];
  /** 사용자가 수동으로 추가한 태그. */
  addedTags: string[];
  createdAt: number;
}

export interface LabelMetrics {
  total: number;
  /** confirm 또는 reject를 한 번이라도 한 레코드 수. */
  verified: number;
  /** 아직 검증 안 된(자동 태그만 있는) 레코드 수. */
  autoOnly: number;
  /** confirmed + added 태그의 분포. */
  tagCounts: Record<string, number>;
}

export class LabelStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LabelStoreError";
  }
}

function read(): LabeledRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LabeledRecord[]) : [];
  } catch {
    // 손상된 저장소는 빈 목록으로 취급(앱이 죽지 않게) — 쓰기 실패는 아래에서 던진다.
    return [];
  }
}

export function listRecords(): LabeledRecord[] {
  return read();
}

export function addRecord(
  input: Omit<LabeledRecord, "id" | "createdAt">,
): LabeledRecord {
  const saved: LabeledRecord = {
    ...input,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `rec_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    createdAt: Date.now(),
  };
  const next = [saved, ...read()];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch (e) {
    // 조용히 "저장됨"이라 거짓말하지 않는다.
    throw new LabelStoreError(
      `라벨 저장에 실패했습니다: ${(e as Error).message}`,
    );
  }
  return saved;
}

export function clearRecords(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}

export function computeMetrics(records: LabeledRecord[]): LabelMetrics {
  const tagCounts: Record<string, number> = {};
  let verified = 0;
  for (const r of records) {
    if (r.confirmedTags.length > 0 || r.rejectedTags.length > 0) verified++;
    for (const t of [...r.confirmedTags, ...r.addedTags]) {
      tagCounts[t] = (tagCounts[t] ?? 0) + 1;
    }
  }
  return {
    total: records.length,
    verified,
    autoOnly: records.length - verified,
    tagCounts,
  };
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportCSV(records: LabeledRecord[]): string {
  const header = [
    "id",
    "createdAt",
    "rawText",
    "autoTags",
    "confirmedTags",
    "rejectedTags",
    "addedTags",
  ].join(",");
  const rows = records.map((r) =>
    [
      r.id,
      new Date(r.createdAt).toISOString(),
      r.rawText,
      r.autoTags.join(";"),
      r.confirmedTags.join(";"),
      r.rejectedTags.join(";"),
      r.addedTags.join(";"),
    ]
      .map((c) => csvCell(String(c)))
      .join(","),
  );
  return [header, ...rows].join("\n") + "\n";
}

export function exportJSONL(records: LabeledRecord[]): string {
  return (
    records
      .map((r) =>
        JSON.stringify({
          id: r.id,
          createdAt: new Date(r.createdAt).toISOString(),
          text: r.rawText,
          labels: [...r.confirmedTags, ...r.addedTags],
          rejected: r.rejectedTags,
          auto: r.autoTags,
        }),
      )
      .join("\n") + "\n"
  );
}
