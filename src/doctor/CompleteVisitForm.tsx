import { useMemo, useState } from "react";
import { completeVisit, type Prescription, type Visit } from "../visits/store";
import { getMember } from "../family/store";
import { checkPrescription, matchLookupDrug, type Warning } from "./prescriptionSafety";

/**
 * 진료 완료 입력 — 소견, 처방(여러 줄), 진료비.
 * 약 이름을 적는 순간 환자 알레르기 계열 충돌·중복을 경고한다(데모 DUR 룩업 범위 안에서).
 * 경고가 있어도 의사가 확인하면 저장할 수 있다 — 판단은 의사가 한다.
 * 저장하면 방문이 수납대기가 되고 환자 수납 화면에 그대로 뜬다.
 * 시연: EMR·전자처방전 연동이 아니라 이 기기 저장소에 쓴다.
 */
interface RxItem extends Prescription {
  warnings: Warning[];
}

function patientSafety(visit: Visit): { allergens: string[]; meds: string[] } {
  if (visit.patientAllergens || visit.patientMeds) {
    return { allergens: visit.patientAllergens ?? [], meds: visit.patientMeds ?? [] };
  }
  const m = getMember(visit.memberId);
  const allergens = m?.allergen ? m.allergen.split(/[,·/]/).map((s) => s.trim()).filter(Boolean) : [];
  return { allergens, meds: m?.meds ?? [] };
}

function describe(w: Warning): string {
  return w.type === "allergy" ? `${w.label} 알레르기 환자예요` : `${w.with}과(와) 중복 — ${w.reason}`;
}

export function CompleteVisitForm({
  visit,
  onDone,
}: {
  visit: Visit;
  onDone: (updated: Visit) => void;
}) {
  const [opinion, setOpinion] = useState("");
  const [rx, setRx] = useState<RxItem[]>([]);
  const [drug, setDrug] = useState("");
  const [dose, setDose] = useState("");
  const [days, setDays] = useState("");
  const [amount, setAmount] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const safety = useMemo(() => patientSafety(visit), [visit]);
  const liveWarnings = useMemo(
    () => (drug.trim() ? checkPrescription(drug, { allergens: safety.allergens, currentMeds: safety.meds, prescribed: rx }) : []),
    [drug, safety, rx],
  );
  const liveUnknown = drug.trim().length > 0 && liveWarnings.length === 0 && !matchLookupDrug(drug);
  const hasWarnings = rx.some((r) => r.warnings.length > 0);

  const amountNum = Number(amount.replace(/[^\d]/g, ""));
  const canSubmit =
    opinion.trim().length > 0 &&
    amount.trim().length > 0 &&
    Number.isInteger(amountNum) &&
    amountNum >= 0 &&
    (!hasWarnings || acknowledged);
  const canAddRx = drug.trim().length > 0 && dose.trim().length > 0 && Number(days) > 0;

  function addRx() {
    if (!canAddRx) return;
    setRx((r) => [...r, { drug: drug.trim(), dose: dose.trim(), days: Number(days), warnings: liveWarnings }]);
    setDrug("");
    setDose("");
    setDays("");
  }

  function removeRx(i: number) {
    setRx((r) => r.filter((_, j) => j !== i));
    setAcknowledged(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      onDone(
        completeVisit(visit.id, {
          opinion,
          prescriptions: rx.map(({ drug, dose, days }) => ({ drug, dose, days })),
          amount: amountNum,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const field =
    "w-full rounded-xl border border-[var(--mist)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--ink)]";
  const label = "mb-1 block text-[11px] font-semibold text-[var(--ink-2)]";

  return (
    <form aria-label="진료 완료 입력" onSubmit={submit} className="mt-3 border-t border-[var(--mist)] pt-3">
      <p className="mb-2 text-sm font-bold text-[var(--ink)]">진료 완료 입력</p>

      <p className="mb-3 rounded-xl bg-[var(--paper)] px-3 py-2 text-[11px] leading-relaxed text-[var(--ink-2)]">
        <span className="font-semibold text-[var(--ink)]">처방 안전 확인</span> · 알레르기:{" "}
        {safety.allergens.length > 0 ? safety.allergens.join(", ") : "등록 없음"} · 복용 중:{" "}
        {safety.meds.length > 0 ? safety.meds.join(", ") : "등록 없음"}
      </p>

      <label htmlFor={`op-${visit.id}`} className={label}>
        소견
      </label>
      <textarea
        id={`op-${visit.id}`}
        value={opinion}
        onChange={(e) => setOpinion(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="환자에게 전달될 소견을 적어 주세요"
        className={field}
      />

      <p className="mb-1 mt-3 text-[11px] font-semibold text-[var(--ink-2)]">처방</p>
      {rx.length > 0 && (
        <ul className="mb-2 flex flex-col gap-1">
          {rx.map((p, i) => (
            <li key={`${p.drug}-${i}`} className="rounded-xl bg-[var(--paper)] px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span>
                  {p.warnings.length > 0 && <span className="mr-1 text-[var(--vital-ink)]">⚠</span>}
                  <span className="font-semibold text-[var(--ink)]">{p.drug}</span>
                  <span className="ml-2 font-data text-[11px] text-[var(--ink-2)]">
                    {p.dose} · {p.days}일분
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`${p.drug} 처방 삭제`}
                  onClick={() => removeRx(i)}
                  className="text-xs text-[var(--ink-2)] underline"
                >
                  삭제
                </button>
              </div>
              {p.warnings.map((w, k) => (
                <p key={k} className="mt-0.5 text-[11px] text-[var(--vital-ink)]">
                  {describe(w)}
                </p>
              ))}
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-[2fr_1.4fr_0.8fr_auto] gap-2">
        <div>
          <label htmlFor={`drug-${visit.id}`} className="sr-only">
            약 이름
          </label>
          <input id={`drug-${visit.id}`} value={drug} onChange={(e) => setDrug(e.target.value)} placeholder="약 이름" className={field} />
        </div>
        <div>
          <label htmlFor={`dose-${visit.id}`} className="sr-only">
            용법
          </label>
          <input id={`dose-${visit.id}`} value={dose} onChange={(e) => setDose(e.target.value)} placeholder="용법" className={field} />
        </div>
        <div>
          <label htmlFor={`days-${visit.id}`} className="sr-only">
            일수
          </label>
          <input id={`days-${visit.id}`} value={days} onChange={(e) => setDays(e.target.value)} inputMode="numeric" placeholder="일" className={field} />
        </div>
        <button
          type="button"
          onClick={addRx}
          disabled={!canAddRx}
          className="min-h-[40px] rounded-xl border border-[var(--mist)] px-3 text-xs font-bold text-[var(--ink)] disabled:opacity-40"
        >
          처방 추가
        </button>
      </div>

      {liveWarnings.length > 0 && (
        <div
          role="alert"
          className="mt-2 rounded-xl border-l-4 border-[var(--vital)] bg-[var(--vital)]/8 px-3 py-2 text-[11px] leading-relaxed text-[var(--vital-ink)]"
        >
          {liveWarnings.map((w, k) => (
            <p key={k}>⚠ {describe(w)}</p>
          ))}
          <p className="mt-1 text-[10px] opacity-80">데모 DUR 룩업(알레르기 계열 5개) 기준이에요. 최종 판단은 의사 선생님이 하세요.</p>
        </div>
      )}
      {liveUnknown && (
        <p className="mt-2 text-[10px] text-[var(--ink-2)]">
          이 약은 데모 룩업에 없어 알레르기 충돌을 확인하지 못해요(중복만 봐요).
        </p>
      )}

      <label htmlFor={`amt-${visit.id}`} className={`${label} mt-3`}>
        진료비(원)
      </label>
      <input
        id={`amt-${visit.id}`}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        inputMode="numeric"
        placeholder="예: 18500"
        className={field}
      />

      {hasWarnings && (
        <label className="mt-3 flex items-start gap-2 rounded-xl bg-[var(--vital)]/8 px-3 py-2 text-xs text-[var(--vital-ink)]">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5 h-4 w-4 flex-none accent-[var(--vital)]"
          />
          <span>처방 경고를 확인했고 그대로 처방해요 (의사 판단)</span>
        </label>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-[var(--vital-ink)]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-3 w-full rounded-2xl bg-[var(--ink)] py-3 text-sm font-bold text-white disabled:bg-[var(--mist)] disabled:text-[var(--ink-2)]"
      >
        진료 완료 → 환자 수납으로 (시연)
      </button>
      <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--ink-2)]">
        시연 — EMR·전자처방전 연동이 아니라 이 기기 저장소에 기록돼요. 환자 화면의 수납·진료기록에 그대로 보여요.
      </p>
    </form>
  );
}
