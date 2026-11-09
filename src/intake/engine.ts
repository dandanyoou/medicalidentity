/**
 * 대화형 문진 엔진 — "말로 하는 문진표".
 *
 * 환자 대부분은 아픔을 말로 잘 설명하지 못한다. 그래서 한 번에 한 질문씩,
 * 누르기만 하면 되는 답(통증 느낌은 쉬운 비유와 함께)을 주고, 끝나면 의사에게
 * 전달할 문장으로 정리한다.
 *
 * 경계: 진단하지 않는다. 병명을 추정하는 문구는 여기서 만들지 않는다(의료기기
 * 소프트웨어 규제 영역). 서버·LLM 없이 규칙만으로 기기 안에서 동작한다.
 */

export type BodyPart =
  | "머리"
  | "눈"
  | "귀·코·목구멍"
  | "목·어깨"
  | "가슴"
  | "배"
  | "허리·등"
  | "팔·손"
  | "다리·발"
  | "피부"
  | "온몸";

export type Step = "parts" | "quality" | "onset" | "severity" | "triggers" | "associated";

export interface IntakeAnswers {
  parts?: BodyPart[];
  quality: Partial<Record<BodyPart, string>>;
  onset?: string;
  severity?: number;
  triggers?: string[];
  associated?: string[];
}

export interface IntakeOption {
  value: string | number;
  label: string;
  hint?: string;
  /** 고르면 다른 선택을 지우는 답(예: "없음"). */
  exclusive?: boolean;
}

export interface IntakeQuestion {
  step: Step;
  prompt: string;
  multi: boolean;
  options: IntakeOption[];
  /** 느낌 질문일 때 어느 부위를 묻는지. */
  part?: BodyPart;
}

export const EMPTY_ANSWERS: IntakeAnswers = { quality: {} };

// 부위 — 순서가 화면 순서이자 guessParts 결과 순서다.
// 키워드는 부분 문자열로 찾는다. "발"은 "발열"과 겹쳐서 조사가 붙은 형태로만 찾는다.
const PARTS: { part: BodyPart; keywords: string[] }[] = [
  { part: "머리", keywords: ["머리", "두통", "관자놀이"] },
  { part: "눈", keywords: ["눈이", "눈도", "눈알", "눈가", "시야"] },
  { part: "귀·코·목구멍", keywords: ["귀", "코가", "콧물", "목구멍", "목이 따끔", "목이 칼칼", "기침", "인후"] },
  { part: "목·어깨", keywords: ["어깨", "뒷목", "목덜미", "목 뒤", "목이 뻐근", "목이 결"] },
  { part: "가슴", keywords: ["가슴", "흉통", "흉부"] },
  { part: "배", keywords: ["배가", "배도", "배는", "아랫배", "윗배", "명치", "속이", "복통", "위가"] },
  { part: "허리·등", keywords: ["허리", "등이", "등도", "등허리", "골반"] },
  { part: "팔·손", keywords: ["팔", "손목", "손가락", "손이", "손도", "팔꿈치"] },
  { part: "다리·발", keywords: ["다리", "무릎", "종아리", "허벅지", "발목", "발바닥", "발가락", "발이", "발도"] },
  { part: "피부", keywords: ["피부", "가려", "두드러기", "발진", "뾰루지"] },
  { part: "온몸", keywords: ["온몸", "전신", "몸살", "몸이 쑤"] },
];

const QUALITIES: (IntakeOption & { link: string; end: string })[] = [
  { value: "욱신", label: "욱신욱신", hint: "맥박이 뛰듯 쿵쿵", link: "욱신욱신 아프고", end: "욱신욱신 아파요" },
  { value: "찌릿", label: "찌릿찌릿", hint: "전기가 오듯", link: "찌릿찌릿하고", end: "찌릿찌릿해요" },
  { value: "콕콕", label: "콕콕", hint: "바늘로 찌르듯", link: "콕콕 찌르듯 아프고", end: "콕콕 찌르듯 아파요" },
  { value: "뻐근", label: "뻐근·결림", hint: "뭉치고 당기듯", link: "뻐근하고 결리고", end: "뻐근하고 결려요" },
  { value: "쥐어짜는", label: "쥐어짜듯", hint: "꽉 조이듯", link: "쥐어짜듯 아프고", end: "쥐어짜듯 아파요" },
  { value: "화끈", label: "화끈화끈", hint: "불에 덴 듯", link: "화끈거리고", end: "화끈거려요" },
  { value: "묵직", label: "묵직함", hint: "무언가 누르듯", link: "묵직하고", end: "묵직해요" },
  { value: "쑤시는", label: "쑤심", hint: "속에서 계속 쑤시듯", link: "쑤시고", end: "쑤셔요" },
  { value: "가려움", label: "가려움", hint: "긁고 싶은 느낌", link: "가렵고", end: "가려워요" },
  { value: "모르겠음", label: "잘 모르겠어요", hint: "괜찮아요, 넘어가도 돼요", link: "불편하고", end: "불편해요" },
];

const ONSETS: (IntakeOption & { from: string })[] = [
  { value: "오늘", label: "오늘", from: "오늘부터" },
  { value: "1-3일", label: "1~3일 전", from: "1~3일 전부터" },
  { value: "1주", label: "일주일쯤 전", from: "일주일쯤 전부터" },
  { value: "1달+", label: "한 달 넘게", from: "한 달도 더 전부터" },
];

const SEVERITIES: IntakeOption[] = [
  { value: 2, label: "조금", hint: "신경 쓰이는 정도" },
  { value: 5, label: "보통", hint: "일상이 불편한 정도" },
  { value: 7, label: "심함", hint: "일을 못 할 정도" },
  { value: 9, label: "아주 심함", hint: "참기 힘든 정도" },
];

const NO_TRIGGER = "특별히 없음";
const TRIGGERS: IntakeOption[] = [
  { value: "움직일 때", label: "움직일 때" },
  { value: "누르면", label: "누르면" },
  { value: "밤에·누우면", label: "밤에·누우면" },
  { value: "먹고 나서", label: "먹고 나서" },
  { value: "숨 쉴 때", label: "숨 쉴 때" },
  { value: NO_TRIGGER, label: NO_TRIGGER, exclusive: true },
];

const NO_ASSOCIATED = "없음";
const ASSOCIATED: IntakeOption[] = [
  { value: "열", label: "열" },
  { value: "구토·메스꺼움", label: "구토·메스꺼움" },
  { value: "어지러움", label: "어지러움" },
  { value: "저림·감각 이상", label: "저림·감각 이상" },
  { value: "숨이 참", label: "숨이 참" },
  { value: NO_ASSOCIATED, label: NO_ASSOCIATED, exclusive: true },
];

/** 한글 마지막 글자 받침에 맞춰 "이/가", "은/는", "을/를"을 붙인다. */
export function withJosa(word: string, pair: "이/가" | "은/는" | "을/를"): string {
  const last = word.charCodeAt(word.length - 1) - 0xac00;
  const hasBatchim = last >= 0 && last <= 11171 && last % 28 !== 0;
  const [withB, withoutB] = pair.split("/");
  return word + (hasBatchim ? withB : withoutB);
}

/** 자유 문장에서 부위를 미리 고른다(환자가 대화에서 확인·수정한다). */
export function guessParts(text: string): BodyPart[] {
  const t = text.replace(/\s+/g, " ");
  return PARTS.filter(({ keywords }) => keywords.some((k) => t.includes(k))).map((p) => p.part);
}

function nextPartWithoutQuality(a: IntakeAnswers): BodyPart | undefined {
  return a.parts?.find((p) => !a.quality[p]);
}

/** 다음에 물을 질문. 다 답했으면 null. */
export function currentQuestion(a: IntakeAnswers): IntakeQuestion | null {
  if (!a.parts) {
    return {
      step: "parts",
      prompt: "어디가 불편하세요? 해당하는 곳을 모두 눌러 주세요.",
      multi: true,
      options: PARTS.map(({ part }) => ({ value: part, label: part })),
    };
  }
  const part = nextPartWithoutQuality(a);
  if (part) {
    return {
      step: "quality",
      prompt: `${withJosa(part, "은/는")} 어떤 느낌이에요? 가장 비슷한 걸 골라 주세요.`,
      multi: false,
      options: QUALITIES.map(({ value, label, hint }) => ({ value, label, hint })),
      part,
    };
  }
  if (a.onset === undefined) {
    return {
      step: "onset",
      prompt: "언제부터 그랬어요?",
      multi: false,
      options: ONSETS.map(({ value, label }) => ({ value, label })),
    };
  }
  if (a.severity === undefined) {
    return { step: "severity", prompt: "얼마나 아파요?", multi: false, options: SEVERITIES };
  }
  if (!a.triggers) {
    return {
      step: "triggers",
      prompt: "언제 더 심해져요? 해당하는 걸 모두 골라 주세요.",
      multi: true,
      options: TRIGGERS,
    };
  }
  if (!a.associated) {
    return {
      step: "associated",
      prompt: "같이 있는 증상이 있나요?",
      multi: true,
      options: ASSOCIATED,
    };
  }
  return null;
}

/** 지금 질문에 대한 답을 넣는다. */
export function answer(a: IntakeAnswers, value: string | number | string[]): IntakeAnswers {
  const q = currentQuestion(a);
  if (!q) return a;
  switch (q.step) {
    case "parts":
      return { ...a, parts: (value as string[]) as BodyPart[] };
    case "quality":
      return { ...a, quality: { ...a.quality, [q.part as BodyPart]: String(value) } };
    case "onset":
      return { ...a, onset: String(value) };
    case "severity":
      return { ...a, severity: Number(value) };
    case "triggers":
      return { ...a, triggers: value as string[] };
    case "associated":
      return { ...a, associated: value as string[] };
  }
}

/** 마지막 답 하나를 지운다(이전 질문으로). */
export function undo(a: IntakeAnswers): IntakeAnswers {
  if (a.associated) return { ...a, associated: undefined };
  if (a.triggers) return { ...a, triggers: undefined };
  if (a.severity !== undefined) return { ...a, severity: undefined };
  if (a.onset !== undefined) return { ...a, onset: undefined };
  const answered = (a.parts ?? []).filter((p) => a.quality[p]);
  if (answered.length > 0) {
    const last = answered[answered.length - 1];
    const quality = { ...a.quality };
    delete quality[last];
    return { ...a, quality };
  }
  if (a.parts) return { ...a, parts: undefined };
  return a;
}

/** 의사에게 전달할 문장. 병명은 쓰지 않고 환자가 고른 것만 옮긴다. */
export function summarize(a: IntakeAnswers): string {
  const sentences: string[] = [];
  const parts = a.parts ?? [];
  if (parts.length > 0) {
    const phrases = parts.map((p, i) => {
      const q = QUALITIES.find((x) => x.value === a.quality[p]) ?? QUALITIES[QUALITIES.length - 1];
      return `${withJosa(p, "이/가")} ${i === parts.length - 1 ? q.end : q.link}`;
    });
    const from = ONSETS.find((o) => o.value === a.onset)?.from;
    sentences.push(`${from ? `${from} ` : ""}${phrases.join(", ")}.`);
  }
  const sev = SEVERITIES.find((s) => s.value === a.severity);
  if (sev) sentences.push(`아픈 정도는 10점 중 ${sev.value}점(${sev.hint})이에요.`);
  const triggers = (a.triggers ?? []).filter((t) => t !== NO_TRIGGER);
  if (triggers.length > 0) sentences.push(`${triggers.join("·")} 더 심해져요.`);
  if (a.associated) {
    const assoc = a.associated.filter((x) => x !== NO_ASSOCIATED);
    sentences.push(assoc.length > 0 ? `같이 있는 증상: ${assoc.join(", ")}.` : "다른 증상은 없어요.");
  }
  return sentences.join(" ");
}
