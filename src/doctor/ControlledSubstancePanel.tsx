import { useMemo, useState } from "react";
import {
  CONTROLLED_SUBSTANCES,
  checkDuplicatePrescription,
  appendChainEntry,
  verifyChain,
  credentialDigest,
  type ChainEntry,
  type PriorVisit,
} from "../controlled-substance";

interface Props {
  priorVisits: PriorVisit[];
}

export function ControlledSubstancePanel({ priorVisits }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [chain, setChain] = useState<ChainEntry[]>([]);
  const [tamperDemo, setTamperDemo] = useState(false);

  const result = useMemo(
    () => (selected ? checkDuplicatePrescription(selected, priorVisits) : null),
    [selected, priorVisits],
  );

  const recordPrescription = () => {
    if (!selected) return;
    const digest = credentialDigest(
      "did:key:demo-hospital-controlled",
      `${selected}-${Date.now()}`,
    );
    setChain((c) => appendChainEntry(c, digest));
  };

  const displayedChain = useMemo(() => {
    if (!tamperDemo || chain.length === 0) return chain;
    // 변조 시뮬레이션: 화면 표시용 사본만 훼손 — 실제 chain state는 건드리지 않음.
    const copy = chain.map((e) => ({ ...e }));
    copy[0] = { ...copy[0], credentialDigest: "tampered" };
    return copy;
  }, [chain, tamperDemo]);

  const chainVerify = useMemo(() => verifyChain(displayedChain), [displayedChain]);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-[var(--ink)] mb-1">
          관리약물 처방 이력 (시드 데이터)
        </h2>
        <p className="text-[10px] text-[var(--ink-2)] mb-3">
          실제 병원 연동이 아닌 빌드타임 시드 데이터 — 백엔드 없이 같은 UI·검증
          로직을 시연.
        </p>
        <ul className="text-xs text-[var(--ink)] space-y-1 mb-3">
          {priorVisits.length === 0 && (
            <li className="text-[var(--ink-2)]">과거 방문 이력 없음</li>
          )}
          {priorVisits.map((v, i) => (
            <li key={i}>
              {v.date} — {v.hospital} — {v.drug}
            </li>
          ))}
        </ul>

        <h3 className="font-medium text-[var(--ink)] mb-2 text-sm">
          처방 예정 관리약물
        </h3>
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {CONTROLLED_SUBSTANCES.map((drug) => (
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
            처방 예정 관리약물을 선택하면 중복처방 여부를 확인합니다.
          </p>
        )}

        {selected && result && result.flagged && (
          <div className="bg-[var(--vital)]/10 border-l-4 border-[var(--vital)] rounded-2xl p-3">
            <div className="font-bold text-[var(--vital-ink)]">
              ⚠ 중복처방 의심 — {selected}
            </div>
            <ul className="text-xs text-[var(--vital-ink)] mt-1 list-disc list-inside">
              {result.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
            <div className="text-[10px] text-[var(--vital-ink)] mt-2">
              정적 룰 기반 판정(AI lite). 실제 병원간 실시간 조회가 아닌
              시드 데이터 기반 시연.
            </div>
          </div>
        )}

        {selected && result && !result.flagged && (
          <div className="bg-[var(--refund)]/10 border-l-4 border-[var(--refund)] rounded-2xl p-3">
            <div className="font-medium text-[var(--refund-ink)]">
              ✅ 중복처방 의심 없음
            </div>
            <div className="text-xs text-[var(--refund-ink)]">처방 예정: <strong>{selected}</strong></div>
          </div>
        )}

        {selected && (
          <button
            onClick={recordPrescription}
            className="mt-3 w-full rounded-full bg-[var(--ink)] py-3 text-sm font-bold text-white active:brightness-110"
          >
            이 처방을 위변조방지 로그에 기록
          </button>
        )}
      </div>

      {chain.length > 0 && (
        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <h3 className="font-semibold text-[var(--ink)] mb-2">
            위변조 방지 로그 (간이 해시체인)
          </h3>
          <p className="text-[10px] text-[var(--ink-2)] mb-2">
            체인에는 처방 내용이 아니라 VC digest만 저장됨 (PHI 평문 없음).
          </p>
          <ol className="text-xs font-mono text-[var(--ink-2)] space-y-1 mb-3">
            {displayedChain.map((e) => (
              <li key={e.seq}>
                #{e.seq} digest={e.credentialDigest.slice(0, 12)}… hash=
                {e.entryHash.slice(0, 12)}…
              </li>
            ))}
          </ol>

          <label className="flex items-center gap-2 text-xs text-[var(--ink-2)] mb-2">
            <input
              type="checkbox"
              checked={tamperDemo}
              onChange={(e) => setTamperDemo(e.target.checked)}
            />
            변조 시뮬레이션 (첫 엔트리 digest 훼손, 화면 표시용)
          </label>

          {chainVerify.ok ? (
            <div className="bg-[var(--refund)]/10 border-l-4 border-[var(--refund)] rounded-2xl p-2 text-xs text-[var(--refund-ink)]">
              ✅ 체인 무결성 검증 통과
            </div>
          ) : (
            <div className="bg-[var(--vital)]/10 border-l-4 border-[var(--vital)] rounded-2xl p-2 text-xs text-[var(--vital-ink)] font-bold">
              ❌ 위변조 탐지됨 — entry #{chainVerify.brokenAtSeq}부터 해시 불일치
            </div>
          )}
        </div>
      )}
    </div>
  );
}
