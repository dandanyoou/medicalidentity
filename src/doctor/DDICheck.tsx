import { useMemo, useState } from "react";
import durLookup from "../data/dur-lookup.json";

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
    return Object.values(durLookup as DurMap).some((drugs) =>
      drugs.includes(selected),
    );
  }, [selected]);

  const conflict = useMemo(() => {
    if (!selected) return null;
    for (const allergen of allergens) {
      const drugs = (durLookup as DurMap)[allergen];
      if (drugs && drugs.includes(selected)) {
        return allergen;
      }
    }
    return null;
  }, [selected, allergens]);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <h2 className="font-semibold text-slate-800 mb-3">처방 예정 약물 (DDI)</h2>

      <div className="grid grid-cols-2 gap-1 mb-3">
        {EMERGENCY_DRUGS.map((drug) => (
          <button
            key={drug}
            onClick={() => setSelected(drug)}
            className={`text-xs px-2 py-1.5 rounded border ${
              selected === drug
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
            }`}
          >
            {drug}
          </button>
        ))}
      </div>

      {!selected && (
        <p className="text-xs text-slate-500">
          처방 예정 약물을 선택하면 알레르기 충돌을 확인합니다.
        </p>
      )}

      {selected && conflict && (
        <div className="bg-rose-100 border-2 border-rose-500 rounded p-3">
          <div className="font-bold text-rose-900">
            ⚠ {conflict.toUpperCase()}계 알레르기 환자 — 충돌
          </div>
          <div className="text-xs text-rose-800 mt-1">
            처방 예정: <strong>{selected}</strong>
          </div>
          {severity && (
            <div className="text-xs text-rose-800">중증도: {severity}</div>
          )}
          <div className="text-[10px] text-rose-700 mt-2">
            대체 약물 검토 필요. 확장 시 LLM 기반 임상 의사결정 지원.
          </div>
        </div>
      )}

      {selected && !conflict && drugInLookup && (
        <div className="bg-emerald-50 border border-emerald-400 rounded p-3">
          <div className="font-medium text-emerald-900">
            ✅ 알려진 충돌 없음
          </div>
          <div className="text-xs text-emerald-800">
            처방 예정: <strong>{selected}</strong>
          </div>
        </div>
      )}

      {selected && !conflict && !drugInLookup && (
        <div className="bg-slate-100 border border-slate-400 rounded p-3">
          <div className="font-medium text-slate-700">
            ⚠️ 데모 룩업에 등록 안 된 약물
          </div>
          <div className="text-xs text-slate-600">
            처방 예정: <strong>{selected}</strong>
          </div>
          <div className="text-[10px] text-slate-500 mt-2">
            수동 확인 필요. 본 데모 룩업은 5개 알레르기·10개 응급 약물만 다룸.
          </div>
        </div>
      )}
    </div>
  );
}
