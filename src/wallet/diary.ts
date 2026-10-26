// 증상 일기 — 환자가 쓴 말을 그대로 시간순으로 저장한다.
//
// 법적 경계(2026-10-26 논의): 이 모듈은 증상을 해석하거나 진단하지 않는다.
// matchedTags는 symptom-info의 키워드 매칭 결과를 참고용으로 같이 저장할
// 뿐이고, 환자의 원문(rawText)이 항상 먼저다. 의료진에게 보여줄 때도
// "이 환자는 OO일 가능성이 높다" 같은 해석을 만들어내지 않는다 — 환자가
// 쓴 글을 시간순으로 그대로 보여주는 게 전부다.
//
// 저장 위치: 서버 없음(Constraints) — localStorage만 쓴다. 기기를 바꾸면
// 기록이 사라진다는 뜻이고, 이건 알려진 한계다(백업/동기화는 범위 밖).

export interface DiaryEntry {
  id: string;
  createdAt: string; // ISO 8601
  rawText: string;
  matchedTags: string[];
  onset?: string;
  severity?: number; // 1(약함)~5(심함), 환자 자가 평가
  note?: string;
}

const STORAGE_KEY = "symptom_diary_v1";

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadDiary(): DiaryEntry[] {
  const storage = safeStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as DiaryEntry[];
  } catch {
    // 손상된 저장값 — 읽을 수 없는 과거 데이터보다 빈 목록이 안전하다.
    return [];
  }
}

function persist(entries: DiaryEntry[]): void {
  safeStorage()?.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function addDiaryEntry(input: {
  rawText: string;
  matchedTags: string[];
  onset?: string;
  severity?: number;
  note?: string;
}): DiaryEntry {
  const entry: DiaryEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    rawText: input.rawText,
    matchedTags: input.matchedTags,
    onset: input.onset,
    severity: input.severity,
    note: input.note,
  };
  const entries = [entry, ...loadDiary()];
  persist(entries);
  return entry;
}

export function deleteDiaryEntry(id: string): void {
  persist(loadDiary().filter((e) => e.id !== id));
}

/** 최신순 정렬된 전체 일기 — 다음 병원에서 그대로 보여줄 때 쓴다. */
export function listDiaryEntries(): DiaryEntry[] {
  return [...loadDiary()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
