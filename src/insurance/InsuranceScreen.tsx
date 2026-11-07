import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listVisits, type Visit } from "../visits/store";
import {
  INSURERS,
  listClaims,
  addClaim,
  getClaimByVisit,
  type Claim,
} from "./store";

const MEMBER = "self";

function won(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}

/**
 * 실손의료보험 간편청구 — 진료기록에서 바로 청구.
 *
 * 매번 영수증·진단서를 사진 찍어 설계사에게 보내지 않고, 진료기록이 들고 있는
 * 서류로 청구를 넣는다. 제출은 보험사 연동 전까지 '시연'.
 */
export function InsuranceScreen() {
  useEffect(() => {
    document.title = "실손보험 청구 (시연) — 가족 의료지갑";
  }, []);

  const [tick, setTick] = useState(0);
  const [openVisitId, setOpenVisitId] = useState<string | null>(null);
  const [insurer, setInsurer] = useState<string | null>(null);
  void tick;

  const visits = listVisits(MEMBER).filter((v) => v.amount > 0);
  const claimable = visits.filter((v) => !getClaimByVisit(v.id));
  const claims = listClaims();
  const visitById = useMemo(() => {
    const map = new Map<string, Visit>();
    listVisits(MEMBER).forEach((v) => map.set(v.id, v));
    return map;
  }, [tick]);

  function openClaim(visitId: string) {
    setOpenVisitId(visitId);
    setInsurer(null);
  }

  function submitClaim(visitId: string) {
    if (!insurer) return;
    addClaim(visitId, insurer);
    setOpenVisitId(null);
    setInsurer(null);
    setTick((t) => t + 1);
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] md:px-6 md:py-10">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-[var(--paper)] md:max-w-xl md:min-h-0 md:overflow-hidden md:rounded-[32px] md:shadow-[0_8px_60px_rgba(11,59,60,0.14)]">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--mist)] bg-[var(--paper)]/92 px-5 py-4 backdrop-blur">
          <Link
            to="/wallet"
            aria-label="지갑으로 돌아가기"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink-2)] hover:bg-[var(--surface)]"
          >
            ‹
          </Link>
          <h1 className="text-base font-extrabold tracking-tight text-[var(--ink)]">
            실손보험 청구
          </h1>
          <span className="ml-1 rounded-full bg-[var(--ink)] px-2 py-0.5 font-data text-[10px] font-bold text-white">
            시연
          </span>
        </header>

        <main className="flex-1 overflow-y-auto px-5 pb-10 pt-5">
          <p className="mb-5 rounded-2xl border-l-4 border-[var(--ink)] bg-[var(--surface)] px-4 py-3 text-xs leading-relaxed text-[var(--ink-2)]">
            실손의료보험 가입자는 낸 병원비 일부를 돌려받아요. 매번 영수증·진단서를 사진
            찍어 보내지 말고 진료기록으로 바로 청구하세요.{" "}
            <strong className="text-[var(--ink)]">실제 보험사 제출은 보험사·실손24 연동이
            선결이라 시연</strong>이고, 서류를 자동으로 모아주는 건 진짜입니다.
          </p>

          {/* 청구 가능한 진료 */}
          <p className="mb-2 px-1 font-data text-[10px] uppercase tracking-[0.2em] text-[var(--ink-2)]">
            청구 가능한 진료
          </p>
          {claimable.length === 0 ? (
            <p className="mb-6 rounded-2xl bg-[var(--surface)] px-4 py-5 text-center text-sm text-[var(--ink-2)]">
              청구할 진료가 없어요. 진료를 받으면 여기에 떠요.
            </p>
          ) : (
            <div className="mb-6 flex flex-col gap-3">
              {claimable.map((v) => (
                <div
                  key={v.id}
                  className="relative overflow-hidden rounded-3xl bg-[var(--surface)] p-5 shadow-[0_1px_12px_rgba(11,59,60,0.07)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[var(--ink)]">{v.hospital}</p>
                      <p className="font-data text-[11px] text-[var(--ink-2)]">
                        {v.date} · {v.dept}
                      </p>
                      <p className="mt-1 truncate text-xs text-[var(--ink-2)]">{v.reason}</p>
                    </div>
                    <p className="flex-none font-data text-base font-bold text-[var(--ink)]">
                      {won(v.amount)}
                    </p>
                  </div>

                  {openVisitId === v.id ? (
                    <div className="animate-reveal-in mt-4">
                      <p className="mb-2 text-xs font-semibold text-[var(--ink-2)]">
                        자동 첨부되는 서류
                      </p>
                      <div className="mb-4 flex flex-wrap gap-1.5">
                        {[
                          "진료비 영수증",
                          "진료비 세부내역서",
                          ...(v.opinion ? ["진단서/소견서"] : []),
                          ...(v.prescriptions && v.prescriptions.length > 0
                            ? ["처방전"]
                            : []),
                        ].map((doc) => (
                          <span
                            key={doc}
                            className="rounded-full bg-[var(--refund)]/10 px-2.5 py-1 text-[11px] font-medium text-[var(--refund-ink)]"
                          >
                            ✓ {doc}
                          </span>
                        ))}
                      </div>

                      <p className="mb-2 text-xs font-semibold text-[var(--ink-2)]">보험사</p>
                      <div className="mb-4 flex flex-wrap gap-1.5">
                        {INSURERS.map((ins) => (
                          <button
                            key={ins}
                            type="button"
                            onClick={() => setInsurer(ins)}
                            aria-pressed={insurer === ins}
                            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                              insurer === ins
                                ? "bg-[var(--ink)] text-white"
                                : "border border-[var(--mist)] bg-[var(--paper)] text-[var(--ink-2)]"
                            }`}
                          >
                            {ins}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        disabled={!insurer}
                        onClick={() => submitClaim(v.id)}
                        className="w-full rounded-2xl bg-[var(--ink)] py-3 text-sm font-bold text-white transition active:brightness-110 disabled:bg-[var(--mist)] disabled:text-[var(--ink-2)]"
                      >
                        실손 청구 제출 (시연)
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openClaim(v.id)}
                      className="mt-4 w-full rounded-2xl bg-[var(--refund)] py-3 text-sm font-bold text-white active:brightness-95"
                    >
                      실손 청구하기
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 청구 현황 */}
          {claims.length > 0 && (
            <>
              <p className="mb-2 px-1 font-data text-[10px] uppercase tracking-[0.2em] text-[var(--ink-2)]">
                청구 현황
              </p>
              <div className="flex flex-col gap-3">
                {claims.map((c) => (
                  <ClaimCard key={c.id} claim={c} visit={visitById.get(c.visitId)} />
                ))}
              </div>
              <p className="mt-3 px-1 text-[11px] leading-relaxed text-[var(--ink-2)]">
                실제 서비스에서는 보험사 심사 후 보통 3~5영업일 내 지급됩니다. (현재는 제출
                시연이라 '접수' 상태로만 표시됩니다.)
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function ClaimCard({ claim, visit }: { claim: Claim; visit?: Visit }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-[var(--surface)] p-4 pl-5 shadow-[0_1px_12px_rgba(11,59,60,0.07)]">
      <div className="absolute inset-y-0 left-0 w-1 bg-[var(--refund)]" />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-[var(--ink)]">{claim.insurer}</p>
          <p className="font-data text-[11px] text-[var(--ink-2)]">
            {visit ? `${visit.hospital} · ${visit.date}` : claim.visitId}
            {visit ? ` · ${won(visit.amount)}` : ""}
          </p>
        </div>
        <span className="rounded-full bg-[var(--refund)]/12 px-2.5 py-1 font-data text-[10px] font-bold text-[var(--refund-ink)]">
          {claim.status}
        </span>
      </div>
    </div>
  );
}
