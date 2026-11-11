import {
  ASKED_ASSOCIATED,
  NONE_ASSOCIATED,
  NONE_TRIGGER,
  onsetLabel,
  orderedParts,
  qualityInfo,
  severityInfo,
  type BodyPart,
  type IntakeRecord,
} from "../intake/engine";

export interface IntakeView {
  primary?: BodyPart;
  /** 가장 불편한 곳부터. 느낌은 환자가 고른 말과 그 비유 그대로. */
  parts: { part: BodyPart; feeling: string; hint: string }[];
  onset?: string;
  severity?: string;
  triggers: string[];
  associated: string[];
  /** 물어봤는데 없다고 답한 증상 — 의사가 다시 묻지 않아도 되게. */
  denied: string[];
  note?: string;
}

/** 저장된 문진 기록을 의사 카드용으로. 해석·추정은 더하지 않는다. */
export function intakeView(r: IntakeRecord): IntakeView {
  const parts = orderedParts({ parts: r.parts, primary: r.primary }).map((part) => {
    const q = qualityInfo(r.quality[part]);
    return { part, feeling: q?.label ?? "답하지 않음", hint: q?.hint ?? "" };
  });
  const sev = severityInfo(r.severity);
  const saidNone = r.associated.includes(NONE_ASSOCIATED);
  return {
    primary: r.primary ?? r.parts[0],
    parts,
    onset: onsetLabel(r.onset),
    severity: sev ? `${sev.score}/10 · ${sev.hint}` : undefined,
    triggers: r.triggers.filter((t) => t !== NONE_TRIGGER),
    associated: r.associated.filter((x) => x !== NONE_ASSOCIATED),
    denied: saidNone ? [...ASKED_ASSOCIATED] : [],
    note: r.note,
  };
}
