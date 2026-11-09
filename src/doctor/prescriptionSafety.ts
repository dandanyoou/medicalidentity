/**
 * 처방 안전 확인 — 의사가 약 이름을 적는 순간 환자 알레르기 계열 충돌과 중복을 본다.
 *
 * 데이터는 기존 DUR 데모 룩업(src/data/dur-lookup.json: 알레르기 계열 5개 → 약물)뿐이다.
 * 약물 간 상호작용 데이터는 없으므로 "상호작용"이라고 말하지 않는다. 룩업에 없는 약은
 * "확인 불가"로 두고, 경고가 있어도 최종 판단은 의사가 한다(확인 후 저장 가능).
 */
import durLookup from "../data/dur-lookup.json";

type DurMap = Record<string, string[]>;
const DUR = durLookup as DurMap;

/** 환자가 적은 알레르기 표현 → DUR 분류 키. */
const ALLERGEN_ALIASES: Record<string, string[]> = {
  penicillin: ["페니실린", "penicillin", "페니실린계"],
  sulfa: ["설파", "설파제", "sulfa", "sulfonamide", "설폰아마이드"],
  nsaid: ["nsaid", "엔세이드", "소염진통제", "비스테로이드", "진통소염제"],
  aspirin: ["아스피린", "aspirin"],
  iodine_contrast: ["조영제", "요오드", "iodine", "contrast"],
};

export const ALLERGY_LABEL: Record<string, string> = {
  penicillin: "페니실린계",
  sulfa: "설파계",
  nsaid: "소염진통제(NSAID)계",
  aspirin: "아스피린",
  iodine_contrast: "요오드 조영제",
};

/** 의사가 적는 한글 약 이름 → DUR 영문 약물명. */
const DRUG_ALIASES: Record<string, string[]> = {
  Amoxicillin: ["아목시실린"],
  Ampicillin: ["암피실린"],
  Piperacillin: ["피페라실린"],
  "Penicillin G": ["페니실린 g", "페니실린g"],
  "Penicillin V": ["페니실린 v", "페니실린v"],
  Sulfamethoxazole: ["설파메톡사졸"],
  "Trimethoprim-Sulfamethoxazole": ["트리메토프림", "박트림", "셉트린"],
  Sulfadiazine: ["설파디아진"],
  Ibuprofen: ["이부프로펜", "부루펜"],
  Naproxen: ["나프록센", "낙센"],
  Ketorolac: ["케토롤락", "케토락"],
  Aspirin: ["아스피린"],
  Iohexol: ["이오헥솔"],
  Iopamidol: ["이오파미돌"],
};

const squash = (s: string) => s.toLowerCase().replace(/[\s()\-_/·,.]/g, "");

export function normalizeAllergen(text: string): string | null {
  const t = squash(text);
  if (!t) return null;
  for (const [key, aliases] of Object.entries(ALLERGEN_ALIASES)) {
    if (aliases.some((a) => t.includes(squash(a)))) return key;
  }
  return null;
}

export function matchLookupDrug(text: string): { drug: string; key: string } | null {
  const t = squash(text);
  if (!t) return null;
  for (const [key, drugs] of Object.entries(DUR)) {
    for (const drug of drugs) {
      const names = [drug, ...(DRUG_ALIASES[drug] ?? [])].map(squash);
      if (names.some((n) => n && t.includes(n))) return { drug, key };
    }
  }
  return null;
}

export type Warning =
  | { type: "allergy"; key: string; label: string }
  | { type: "duplicate"; with: string; reason: string };

export function checkPrescription(
  drugText: string,
  ctx: { allergens: string[]; currentMeds: string[]; prescribed: { drug: string }[] },
): Warning[] {
  const match = matchLookupDrug(drugText);
  const out: Warning[] = [];

  if (match) {
    const keys = new Set(ctx.allergens.map(normalizeAllergen).filter((k): k is string => !!k));
    if (keys.has(match.key)) out.push({ type: "allergy", key: match.key, label: ALLERGY_LABEL[match.key] ?? match.key });
  }

  const sameDrug = (other: string) => {
    const a = squash(drugText);
    const b = squash(other);
    const m2 = matchLookupDrug(other);
    if (match && m2 && match.drug === m2.drug) return true;
    // 룩업에 없는 약은 이름이 서로 포함되면 같은 약으로 본다(용량만 다른 경우).
    const stem = (s: string) => s.replace(/\d+(mg|g|ml|mcg|정|캡슐)?.*$/, "");
    const sa = stem(a);
    const sb = stem(b);
    return sa.length >= 2 && sb.length >= 2 && (sa.includes(sb) || sb.includes(sa));
  };

  for (const p of ctx.prescribed) {
    if (sameDrug(p.drug)) out.push({ type: "duplicate", with: p.drug, reason: "같은 약" });
  }
  for (const m of ctx.currentMeds) {
    if (sameDrug(m)) {
      out.push({ type: "duplicate", with: m, reason: "같은 약" });
      continue;
    }
    const m2 = matchLookupDrug(m);
    if (match && m2 && match.key === m2.key) {
      out.push({ type: "duplicate", with: m, reason: `같은 계열(${match.key})` });
    }
  }
  return out;
}
