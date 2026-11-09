import { useState } from "react";
import { completeVisit, type Prescription, type Visit } from "../visits/store";

/**
 * 진료 완료 입력 — 소견, 처방(여러 줄), 진료비.
 * 저장하면 방문이 수납대기가 되고 환자 수납 화면에 그대로 뜬다.
 * 시연: EMR·전자처방전 연동이 아니라 이 기기 저장소에 쓴다.
 */
export function CompleteVisitForm({
  visit,
  onDone,
}: {
  visit: Visit;
  onDone: (updated: Visit) => void;
}) {
  const [opinion, setOpinion] = useState("");
  const [rx, setRx] = useState<Prescription[]>([]);
  const [drug, setDrug] = useState("");
  const [dose, setDose] = useState("");
  const [days, setDays] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const amountNum = Number(amount.replace(/[^\d]/g, ""));
  const canSubmit = opinion.trim().length > 0 && amount.trim().length > 0 && Number.isInteger(amountNum) && amountNum >= 0;
  const canAddRx = drug.trim().length > 0 && dose.trim().length > 0 && Number(days) > 0;

  function addRx() {
    if (!canAddRx) return;
    setRx((r) => [...r, { drug: drug.trim(), dose: dose.trim(), days: Number(days) }]);
    setDrug("");
    setDose("");
    setDays("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      onDone(completeVisit(visit.id, { opinion, prescriptions: rx, amount: amountNum }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const field =
    "w-full rounded-xl border border-[var(--mist)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--ink)]";
  const label = "mb-1 block text-[11px] font-semibold text-[var(--ink-2)]";

  return (
    <form
      aria-label="진료 완료 입력"
      onSubmit={submit}
      className="mt-3 border-t border-[var(--mist)] pt-3"
    >
      <p className="mb-2 text-sm font-bold text-[var(--ink)]">진료 완료 입력</p>

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
            <li key={`${p.drug}-${i}`} className="flex items-center justify-between rounded-xl bg-[var(--paper)] px-3 py-2 text-sm">
              <span>
                <span className="font-semibold text-[var(--ink)]">{p.drug}</span>
                <span className="ml-2 font-data text-[11px] text-[var(--ink-2)]">
                  {p.dose} · {p.days}일분
                </span>
              </span>
              <button
                type="button"
                aria-label={`${p.drug} 처방 삭제`}
                onClick={() => setRx((r) => r.filter((_, j) => j !== i))}
                className="text-xs text-[var(--ink-2)] underline"
              >
                삭제
              </button>
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
