import { useMemo, useState } from "react";
import durLookup from "../data/dur-lookup.json";
import { existsInLookup, firstMatchingKey } from "../lib/lookup";

const EMERGENCY_DRUGS = [
  "Amoxicillin",
  "Ampicillin",
  "Sulfamethoxazole",
  "Ibuprofen",
  "Aspirin",
  "Iohexol",
  "Vancomycin",
  "Acetaminophen",
  "Morphine",
  "Epinephrine",
] as const;

type DurMap = Record<string, string[]>;

interface Props {
  allergens: string[];
  severity?: string;
}

export function DDICheck({ allergens, severity }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const drugInLookup = useMemo(() => {
    if (!selected) return null;
    return existsInLookup(selected, durLookup as DurMap);
  }, [selected]);

  const conflict = useMemo(() => {
    if (!selected) return null;
    return firstMatchingKey(selected, allergens, durLookup as DurMap);
  }, [selected, allergens]);

  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm">
      <h2 className="font-semibold text-[var(--ink)] mb-3 text-sm">처방 예정 약물 (DDI)</h2>

      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {EMERGENCY_DRUGS.map((drug) => (
          <button
            key={drug}
            onClick={() => setSelected(drug)}
            className={`text-xs px-2 py-1.5 rounded-xl border transition ${
              selected === drug
                ? "bg-[var(--ink)] text-white border-[var(--ink)]"
                : "bg-[var(--paper)] text-[var(--ink)] border-[var(--mist)] hover:bg-[var(--mist)]"
            }`}
          >
            {drug}
          </button>
        ))}
      </div>

      {!selected && (
        <p className="text-xs text-[var(--ink-2)]">
          처방 예정 약물을 선택하면 알레르기 충돌을 확인합니다.
        </p>
      )}

      {selected && conflict && (
        <div className="bg-[var(--vital)]/10 border-l-4 border-[var(--vital)] rounded-2xl p-3">
          <div className="font-bold text-[var(--vital-ink)]">
            ⚠ {conflict.toUpperCase()}계 알레르기 환자 — 충돌
          </div>
          <div className="text-xs text-[var(--vital-ink)] mt-1">
            처방 예정: <strong>{selected}</strong>
          </div>
          {severity && (
            <div className="text-xs text-[var(--vital-ink)]">중증도: {severity}</div>
          )}
          <div className="text-[10px] text-[var(--vital-ink)] mt-2">
            대체 약물 검토 필요. 확장 시 LLM 기반 임상 의사결정 지원.
          </div>
        </div>
      )}

      {selected && !conflict && drugInLookup && (
        <div className="bg-[var(--refund)]/10 border-l-4 border-[var(--refund)] rounded-2xl p-3">
          <div className="font-medium text-[var(--refund-ink)]">
            ✅ 알려진 충돌 없음
          </div>
          <div className="text-xs text-[var(--refund-ink)]">
            처방 예정: <strong>{selected}</strong>
          </div>
        </div>
      )}

      {selected && !conflict && !drugInLookup && (
        <div className="bg-[var(--mist)] border-l-4 border-[var(--ink-2)] rounded-2xl p-3">
          <div className="font-medium text-[var(--ink)]">
            ⚠️ 데모 룩업에 등록 안 된 약물
          </div>
          <div className="text-xs text-[var(--ink-2)]">
            처방 예정: <strong>{selected}</strong>
          </div>
          <div className="text-[10px] text-[var(--ink-2)] mt-2">
            수동 확인 필요. 본 데모 룩업은 5개 알레르기·10개 응급 약물만 다룸.
          </div>
        </div>
      )}
    </div>
  );
}
