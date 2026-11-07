import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CAP_TABLES,
  CheckerInputError,
  computeOverage,
  type IncomeTier,
  type OverageResult,
} from "./calc";
import { BottomSheet } from "../shell/BottomSheet";
import { buildIcsEvent, triggerIcsDownload } from "./ics";
import { trackCheckerEvent } from "./analytics";
import { CountUp } from "../shell/CountUp";
import { Stepper } from "../shell/Stepper";

// 받기 타임라인(Stepper용) — 체크리스트와 같은 3단계.
const REFUND_STEPS = [
  { label: "조회·신청", desc: "공단 앱" },
  { label: "계좌 등록", desc: "자동입금" },
  { label: "지급 대기", desc: "며칠 내" },
];

/**
 * 의료비 환급 — "계산기"가 아니라 "환급을 실제로 받게 해주는" 파이프라인.
 *
 *   입력(금액·소득분위)  →  숨은 환급금 발견  →  받기 3단계  →  상태 추적
 *
 * 정직한 차별점: 우리는 공단 연동·본인인증이 없어 '대신 신청'은 못 한다(그건
 * 거짓이 됨). 대신 — 대행(삼쩜삼·토스)은 환급액의 10~20%를 수수료로 떼지만,
 * 우리는 공식 무료 경로로 끝까지 안내하고(수수료 0) 가족 단위로 챙긴다.
 */
const SUPPORTED_YEAR = 2026;
const NHIS_REFUND_URL = "https://www.nhis.or.kr/nhis/minwon/wbhada01000m01.do";
const INCOME_TIER_INFO_URL =
  "https://www.nhis.or.kr/nhis/minwon/wbhapa01000m01.do?mode=view&articleNo=10946900";
const TIERS: IncomeTier[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// 받기 3단계 — 실제 서비스(삼쩜삼/토스)의 "조회→신청→지급" 파이프라인과 같은
// 모양이되, 수수료 떼는 대행이 아니라 공식 무료 경로로 안내한다.
const CLAIM_STEPS = [
  {
    title: "The건강보험 앱에서 내 환급금 조회·신청",
    desc: "간편인증 → '민원여기요' → '환급금 조회/신청'. 실제 금액 확인과 신청은 공단 공식 경로에서 무료로.",
    cta: "공단 신청 바로가기",
    url: NHIS_REFUND_URL,
  },
  {
    title: "지급동의계좌 등록",
    desc: "계좌를 한 번 등록해 두면 다음부턴 신청 없이 자동 입금돼요. (공단 ☎ 1577-1000)",
    cta: "계좌 등록 안내",
    url: NHIS_REFUND_URL,
  },
  {
    title: "신청 완료 → 지급 대기",
    desc: "보통 신청 후 며칠 내 입금됩니다. 소멸시효(약 3년)가 지나면 못 받으니 미루지 마세요.",
    cta: null as string | null,
    url: null as string | null,
  },
];

function formatWon(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatMoneyInput(digits: string): string {
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

export function CheckerScreen() {
  useEffect(() => {
    document.title = "의료비 환급 — 숨은 환급금 찾기";
  }, []);

  const [medicalCostDigits, setMedicalCostDigits] = useState("");
  const [incomeTier, setIncomeTier] = useState<IncomeTier | null>(null);
  // 소득분위 도움말 시트 — 분위별 상한액 표에서 바로 고를 수 있게.
  const [tierHelpOpen, setTierHelpOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OverageResult | null>(null);
  const [icsAttempted, setIcsAttempted] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "shared" | "copied">("idle");
  const [claimDone, setClaimDone] = useState<boolean[]>([false, false, false]);

  const canSubmit = medicalCostDigits.length > 0 && incomeTier !== null;
  const claimCount = claimDone.filter(Boolean).length;

  function handleMedicalCostChange(raw: string) {
    setMedicalCostDigits(raw.replace(/[^0-9]/g, ""));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit || incomeTier === null) return;

    setError(null);
    setResult(null);
    setIcsAttempted(false);
    setShareStatus("idle");
    setClaimDone([false, false, false]);

    try {
      const computed = computeOverage(Number(medicalCostDigits), incomeTier, SUPPORTED_YEAR);
      setResult(computed);
      trackCheckerEvent("checker_completed");
    } catch (err) {
      setError(
        err instanceof CheckerInputError
          ? err.message
          : "계산 중 알 수 없는 오류가 발생했습니다. 입력값을 확인해주세요.",
      );
    }
  }

  async function handleShare() {
    const shareData = {
      title: "의료비 환급",
      text: "안 찾아간 의료비 환급, 1분이면 확인돼요. 가족 것도 같이 챙겨보세요.",
      url: window.location.href,
    };
    trackCheckerEvent("checker_shared");
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareStatus("shared");
        return;
      }
    } catch {
      /* 공유 취소 등 — 클립보드 복사로 대체 */
    }
    try {
      await navigator.clipboard.writeText(shareData.url);
      setShareStatus("copied");
    } catch {
      /* 클립보드도 막힘 — 공유는 부가 기능이므로 조용히 무시 */
    }
  }

  function handleIcsDownload() {
    if (!result) return;
    try {
      const ics = buildIcsEvent({
        summary: "본인부담상한제 환급 신청 기한(추정)",
        description:
          "의료비 환급 신청 기한 추정입니다. 정확한 기한은 공단 공식 안내로 확인하세요.",
        date: result.estimatedApplicationDeadline,
      });
      triggerIcsDownload("환급신청기한.ics", ics);
      trackCheckerEvent("checker_ics_downloaded");
    } catch {
      /* 다운로드 실패해도 아래 수동 안내는 그대로 */
    }
    setIcsAttempted(true);
  }

  const step = result ? 2 : 1;

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
            의료비 환급
          </h1>
          <div className="ml-auto flex gap-1.5">
            <span
              className={`h-1.5 w-5 rounded-full ${step >= 1 ? "bg-[var(--refund)]" : "bg-[var(--mist)]"}`}
            />
            <span
              className={`h-1.5 w-5 rounded-full ${step >= 2 ? "bg-[var(--refund)]" : "bg-[var(--mist)]"}`}
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-5 pb-32 pt-5 md:pb-6">
          <p className="mb-5 text-sm leading-relaxed text-[var(--ink-2)]">
            안 찾아가 쌓인 의료비 환급금이 전국에{" "}
            <strong className="text-[var(--ink)]">3,617억원</strong>. 당신 것부터 1분 만에
            확인하세요. 입력값은 서버로 보내지 않고 이 기기에서만 계산됩니다.
          </p>

          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-2xl border-l-4 border-[var(--vital)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--vital-ink)]"
            >
              <span>{error}</span>
            </div>
          )}

          <form id="checker-form" onSubmit={handleSubmit}>
            <section className="rounded-[28px] bg-[var(--surface)] p-5 shadow-[0_2px_24px_rgba(11,59,60,0.09)]">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[var(--ink)]">
                  {SUPPORTED_YEAR}년 본인부담 의료비
                </span>
                {/* 토스 송금 입력 패턴: 우측정렬 대형 숫자 + 단위. */}
                <div className="flex items-baseline gap-1.5 border-b-2 border-[var(--mist)] pb-3 focus-within:border-[var(--ink)]">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatMoneyInput(medicalCostDigits)}
                    onChange={(e) => handleMedicalCostChange(e.target.value)}
                    placeholder="0"
                    aria-label="본인부담 의료비(원)"
                    className="w-full min-w-0 border-none bg-transparent text-right font-data text-[44px] font-bold leading-none tracking-tight text-[var(--ink)] outline-none placeholder:text-[var(--mist)]"
                  />
                  <span className="flex-none text-xl font-bold text-[var(--ink-2)]">원</span>
                </div>
                <p className="mt-2 text-right text-[11px] text-[var(--ink-2)]">
                  올해 병원·약국에서 낸 본인부담금 합계
                </p>
              </label>

              <div className="mt-5">
                <span className="mb-2 block text-sm font-bold text-[var(--ink)]">
                  건강보험료 소득분위
                </span>
                <div className="relative">
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    {TIERS.map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setIncomeTier(tier)}
                        aria-pressed={incomeTier === tier}
                        className={`flex h-11 w-11 flex-none items-center justify-center rounded-full font-data text-sm font-bold transition ${
                          incomeTier === tier
                            ? "bg-[var(--ink)] text-white"
                            : "border border-[var(--mist)] bg-[var(--paper)] text-[var(--ink-2)]"
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--surface)] to-transparent" />
                </div>
                <button
                  type="button"
                  onClick={() => setTierHelpOpen(true)}
                  className="mt-2 text-xs font-semibold text-[var(--refund-ink)] underline-offset-2 hover:underline"
                >
                  소득분위를 모르겠어요
                </button>
                <BottomSheet
                  open={tierHelpOpen}
                  title="내 소득분위는?"
                  onClose={() => setTierHelpOpen(false)}
                >
                  <p className="text-sm leading-relaxed text-[var(--ink-2)]">
                    건강보험료를 기준으로 1~10분위로 나뉘어요. 분위마다 1년 본인부담 상한액이
                    달라서, 그 이상 낸 병원비를 돌려받아요. 모르겠으면{" "}
                    <strong className="text-[var(--ink)]">5분위</strong>로 먼저 계산해 보세요.
                  </p>
                  <ul className="mt-3 overflow-hidden rounded-2xl bg-[var(--paper)]">
                    {CAP_TABLES[SUPPORTED_YEAR].map((row, i) => (
                      <li key={row.tiers.join("-")} className={i > 0 ? "border-t border-[var(--mist)]" : ""}>
                        <button
                          type="button"
                          onClick={() => {
                            setIncomeTier(row.tiers[row.tiers.length - 1]);
                            setTierHelpOpen(false);
                          }}
                          className="flex w-full items-center justify-between px-4 py-3 text-left active:bg-[var(--surface)]"
                        >
                          <span className="text-sm font-bold text-[var(--ink)]">
                            {row.tiers.length > 1
                              ? `${row.tiers[0]}~${row.tiers[row.tiers.length - 1]}분위`
                              : `${row.tiers[0]}분위`}
                          </span>
                          <span className="font-data text-sm text-[var(--ink-2)]">
                            상한 {formatWon(row.capAmountWon)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={INCOME_TIER_INFO_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 block w-full rounded-2xl border border-[var(--mist)] py-3 text-center text-sm font-bold text-[var(--ink)] active:bg-[var(--paper)]"
                  >
                    공단에서 내 분위 확인하기 ↗
                  </a>
                </BottomSheet>
              </div>
            </section>
          </form>

          {result && (
            <div className="animate-reveal-in mt-4">
              {result.isOverCap ? (
                <>
                  {/* 발견 모먼트 */}
                  <section
                    className="relative overflow-hidden rounded-[28px] p-6 text-white shadow-[0_14px_44px_rgba(10,107,74,0.3)]"
                    style={{ background: "linear-gradient(158deg, #0e9f6e 0%, #0a6b4a 100%)" }}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
                      숨은 환급금 발견
                    </p>
                    <p className="mt-2 font-data text-[40px] font-bold leading-none">
                      <CountUp value={result.overageWon} suffix="원" />
                    </p>
                    <p className="mt-2 text-sm text-white/85">
                      {SUPPORTED_YEAR}년 소득분위 상한액 {formatWon(result.capAmountWon)} 초과분.
                      이 돈은 당신 겁니다 — 신청하면 돌려받아요.
                    </p>
                  </section>

                  {/* 차별점 */}
                  <div className="mt-3 rounded-2xl border-l-4 border-[var(--refund)] bg-[var(--surface)] px-4 py-3 text-xs leading-relaxed text-[var(--ink-2)]">
                    <strong className="text-[var(--ink)]">수수료 0원.</strong> 대행 서비스는
                    환급액의 10~20%를 떼지만, 우리는 공식 무료 경로로 끝까지 안내만 합니다 —
                    환급금은 100% 당신 것.
                  </div>

                  {/* 받기 3단계 + 상태 추적 */}
                  <section className="mt-4 rounded-[28px] bg-[var(--surface)] p-5 shadow-[0_2px_24px_rgba(11,59,60,0.09)]">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-sm font-extrabold text-[var(--ink)]">환급 받기</h2>
                      <span className="font-data text-[11px] text-[var(--ink-2)]">
                        {claimCount}/3 완료
                      </span>
                    </div>
                    <div className="mb-5">
                      <Stepper steps={REFUND_STEPS} current={Math.min(claimCount, 2)} />
                    </div>

                    <ol className="flex flex-col gap-3">
                      {CLAIM_STEPS.map((s, i) => {
                        const done = claimDone[i];
                        return (
                          <li key={s.title} className="flex gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                setClaimDone((prev) =>
                                  prev.map((v, idx) => (idx === i ? !v : v)),
                                )
                              }
                              aria-pressed={done}
                              aria-label={`${s.title} 완료 표시`}
                              className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold transition ${
                                done
                                  ? "bg-[var(--refund)] text-white"
                                  : "border border-[var(--mist)] text-[var(--ink-2)]"
                              }`}
                            >
                              {done ? "✓" : i + 1}
                            </button>
                            <div className="flex-1">
                              <p
                                className={`text-sm font-bold ${done ? "text-[var(--ink-2)] line-through" : "text-[var(--ink)]"}`}
                              >
                                {s.title}
                              </p>
                              <p className="mt-0.5 text-xs leading-relaxed text-[var(--ink-2)]">
                                {s.desc}
                              </p>
                              {s.url && s.cta && (
                                <a
                                  href={s.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1.5 inline-block rounded-full bg-[var(--ink)] px-3 py-1.5 text-xs font-bold text-white"
                                >
                                  {s.cta} →
                                </a>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ol>

                    {claimCount === 3 && (
                      <p className="mt-4 rounded-2xl bg-[var(--refund)]/12 px-4 py-3 text-center text-sm font-bold text-[var(--refund-ink)]">
                        환급 신청 완료 🎉 입금을 기다려주세요.
                      </p>
                    )}

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={handleIcsDownload}
                        className="flex-1 rounded-2xl border border-[var(--mist)] py-2.5 text-xs font-bold text-[var(--ink-2)] active:bg-[var(--paper)]"
                      >
                        신청기한 캘린더 저장
                      </button>
                      <button
                        type="button"
                        onClick={handleShare}
                        className="flex-1 rounded-2xl border border-[var(--mist)] py-2.5 text-xs font-bold text-[var(--ink-2)] active:bg-[var(--paper)]"
                      >
                        {shareStatus === "idle" ? "가족에게 공유" : "공유됨"}
                      </button>
                    </div>
                    {icsAttempted && (
                      <p className="mt-2 text-[11px] text-[var(--ink-2)]">
                        다운로드가 안 됐다면 캘린더에 직접 추가:{" "}
                        <strong className="text-[var(--ink)]">
                          {formatDate(result.estimatedApplicationDeadline)}
                        </strong>
                      </p>
                    )}
                  </section>

                  <p className="mt-4 rounded-2xl bg-[var(--surface)] px-4 py-3 text-xs leading-relaxed text-[var(--ink-2)]">
                    가족 구성원도 각각 환급 대상일 수 있어요. 홈에서 가족을 전환해
                    부모님 것도 확인해보세요.
                  </p>
                </>
              ) : (
                <section className="rounded-[28px] bg-[var(--surface)] p-6 shadow-[0_2px_24px_rgba(11,59,60,0.09)]">
                  <p className="text-sm font-bold text-[var(--ink)]">
                    {SUPPORTED_YEAR}년은 상한액({formatWon(result.capAmountWon)})을 넘지
                    않은 것으로 보여요.
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--ink-2)]">
                    의료비가 더 늘거나 소득분위가 바뀌면 결과가 달라져요. 가족 구성원은
                    대상일 수 있으니 홈에서 전환해 확인해보세요.
                  </p>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="mt-4 w-full rounded-2xl border border-[var(--mist)] py-3 text-sm font-bold text-[var(--ink-2)] active:bg-[var(--paper)]"
                  >
                    {shareStatus === "idle" ? "가족에게 공유" : "공유됨"}
                  </button>
                </section>
              )}
            </div>
          )}
        </main>

        {!result && (
          <div className="pointer-events-none fixed bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] left-1/2 z-10 w-full max-w-md -translate-x-1/2 md:static md:left-auto md:w-full md:max-w-none md:translate-x-0">
            <div className="pointer-events-auto border-t border-[var(--mist)] bg-[var(--paper)]/95 px-5 py-3 backdrop-blur md:rounded-b-[32px]">
              <button
                type="submit"
                form="checker-form"
                disabled={!canSubmit}
                className="w-full rounded-2xl bg-[var(--refund)] py-3.5 text-base font-bold text-white transition active:brightness-95 disabled:bg-[var(--mist)] disabled:text-[var(--ink-2)]"
              >
                내 숨은 환급금 찾기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
