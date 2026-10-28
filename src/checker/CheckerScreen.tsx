import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckerInputError, computeOverage, type IncomeTier, type OverageResult } from "./calc";
import { buildIcsEvent, triggerIcsDownload } from "./ics";
import { trackCheckerEvent } from "./analytics";

const SUPPORTED_YEAR = 2026;
const OFFICIAL_APPLICATION_URL = "https://www.nhis.or.kr/nhis/minwon/wbhada01000m01.do";
const INCOME_TIER_INFO_URL =
  "https://www.nhis.or.kr/nhis/minwon/wbhapa01000m01.do?mode=view&articleNo=10946900";
const TIERS: IncomeTier[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const WAITLIST_CONTACT_EMAIL = "gimdanyu94@gmail.com";

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
    document.title = "의료비 체커 — 본인부담상한제 환급 확인";
  }, []);

  const [medicalCostDigits, setMedicalCostDigits] = useState("");
  const [incomeTier, setIncomeTier] = useState<IncomeTier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OverageResult | null>(null);
  const [icsAttempted, setIcsAttempted] = useState(false);
  const [paymentStage, setPaymentStage] = useState<"idle" | "collecting" | "submitted">("idle");
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [shareStatus, setShareStatus] = useState<"idle" | "shared" | "copied">("idle");

  const canSubmit = medicalCostDigits.length > 0 && incomeTier !== null;

  function handleMedicalCostChange(raw: string) {
    setMedicalCostDigits(raw.replace(/[^0-9]/g, ""));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    // 버튼이 canSubmit=false일 때 비활성화되므로 incomeTier는 항상 non-null —
    // 아래는 사용자에게 보이지 않는 타입 가드일 뿐, 에러 메시지가 아니다.
    if (!canSubmit || incomeTier === null) return;

    setError(null);
    setResult(null);
    setIcsAttempted(false);
    setPaymentStage("idle");
    setWaitlistEmail("");
    setShareStatus("idle");

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
      title: "의료비 체커",
      text: "본인부담상한제로 환급받을 수 있는지 확인해봤어요 — 1분이면 돼요.",
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
      // 사용자가 공유를 취소한 경우 등 — 클립보드 복사로 대체.
    }
    try {
      await navigator.clipboard.writeText(shareData.url);
      setShareStatus("copied");
    } catch {
      // 클립보드 접근도 막힌 경우 — 조용히 무시, 공유는 부가 기능일 뿐.
    }
  }

  function handleIcsDownload() {
    if (!result) return;
    // Blob/DOM API가 막힌 드문 환경에서도 조용히 죽지 않게 — 실패해도
    // "다운로드가 시작되지 않았다면 직접 추가해주세요" 폴백 문구가 바로
    // 뜨게 한다(사용자 입장에선 느렸다/실패했다를 구분할 필요 없음).
    try {
      const ics = buildIcsEvent({
        summary: "본인부담상한제 환급 신청 기한(추정)",
        description: "의료비·시효 체커에서 계산한 추정 신청 기한입니다. 정확한 기한은 공식 안내로 확인하세요.",
        date: result.estimatedApplicationDeadline,
      });
      triggerIcsDownload("환급신청기한.ics", ics);
      trackCheckerEvent("checker_ics_downloaded");
    } catch {
      // 다운로드 자체는 실패해도 아래 수동 추가 안내는 그대로 보여준다.
    }
    setIcsAttempted(true);
  }

  function handlePaymentIntentClick() {
    trackCheckerEvent("checker_payment_intent_clicked");
    setPaymentStage("collecting");
  }

  async function handleWaitlistSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!waitlistEmail.includes("@")) return;

    trackCheckerEvent("checker_waitlist_submitted");
    // 백엔드가 없으므로(Constraints) 이메일을 서버에 저장하지 않는다 — 사용자의
    // 메일 앱으로 직접 창업자에게 신청 메일을 보내게 한다(사용자 동의하에 전송,
    // founder가 본인 메일함에서 바로 확인 가능).
    //
    // 주의(VC 루프 iter 4): 데스크톱 등 메일 앱이 설정 안 된 환경에서는
    // mailto:가 조용히 아무 일도 안 할 수 있다(.ics 다운로드와 같은 종류의
    // 실패 양상) — 성공 여부를 알 수 없으니 클립보드 복사를 항상 함께 해서
    // 수동으로라도 보낼 수 있게 한다.
    const subject = "체커 플러스 사전 신청";
    const bodyText = `신청 이메일: ${waitlistEmail}`;
    window.location.href = `mailto:${WAITLIST_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    try {
      await navigator.clipboard.writeText(`${WAITLIST_CONTACT_EMAIL} / ${subject} / ${bodyText}`);
    } catch {
      // 클립보드 접근 불가 — 메일 앱이 열렸다면 어차피 문제 없음, 둘 다 실패해도
      // 아래 안내 문구에 이메일 주소가 그대로 노출되어 있다.
    }
    setPaymentStage("submitted");
  }

  const step = result ? 2 : 1;

  return (
    <div className="min-h-screen bg-slate-100 md:px-6 md:py-10">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-slate-50 shadow-xl md:max-w-2xl md:min-h-0 md:overflow-hidden md:rounded-3xl md:shadow-2xl">
        {/* 앱 상단바 — 데스크톱에서도 카드 안에 그대로 고정(모바일 폰 목업과
            똑같은 톤 유지, 레이아웃만 넓게). 모바일/웹 둘 다 같은 컴포넌트다. */}
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur">
          <Link
            to="/wallet"
            aria-label="지갑으로 돌아가기"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
          >
            ‹
          </Link>
          <h1 className="text-base font-semibold text-slate-900">의료비 체커</h1>
          <div className="ml-auto flex gap-1.5">
            <span className={`h-1.5 w-5 rounded-full ${step >= 1 ? "bg-blue-600" : "bg-slate-200"}`} />
            <span className={`h-1.5 w-5 rounded-full ${step >= 2 ? "bg-blue-600" : "bg-slate-200"}`} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-32 pt-5 md:pb-6">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            국민건강보험공단 고시 기준 상한액표 사용
          </div>
          <p className="mb-5 text-sm leading-relaxed text-slate-500">
            숫자만 입력하면 본인부담상한제 초과 여부를 바로 알려드려요. 입력한 내용은
            서버로 전송되지 않고 이 기기에서만 계산됩니다.
          </p>

          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                !
              </span>
              <span>{error}</span>
            </div>
          )}

          <form id="checker-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <section className="rounded-3xl bg-white p-5 shadow-sm">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-600">
                  {SUPPORTED_YEAR}년 본인부담 의료비
                </span>
                <div className="flex items-end gap-1 border-b-2 border-slate-200 pb-2 focus-within:border-blue-600">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatMoneyInput(medicalCostDigits)}
                    onChange={(event) => handleMedicalCostChange(event.target.value)}
                    placeholder="0"
                    className="w-full border-none bg-transparent text-3xl font-bold text-slate-900 outline-none placeholder:text-slate-300"
                  />
                  <span className="pb-0.5 text-lg font-medium text-slate-400">원</span>
                </div>
              </label>

              <div className="mt-5">
                <span className="mb-2 block text-sm font-medium text-slate-600">
                  건강보험료 소득분위
                </span>
                {/* 10분위 전부가 한 화면에 안 들어와 가로 스크롤이 필요한데,
                    기본 overflow-x-auto만으로는 스크롤 가능하다는 신호가 거의
                    안 보인다(마지막 칩이 살짝만 보임) — 오른쪽에 그라데이션
                    페이드를 얹어 "더 있다"는 걸 드러낸다. */}
                <div className="relative">
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    {TIERS.map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setIncomeTier(tier)}
                        aria-pressed={incomeTier === tier}
                        className={`flex h-11 w-11 flex-none items-center justify-center rounded-full text-sm font-semibold transition ${
                          incomeTier === tier
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
                </div>
                <details className="mt-2 text-xs text-slate-400">
                  <summary className="cursor-pointer select-none text-blue-600">
                    소득분위를 모르겠어요
                  </summary>
                  <p className="mt-1.5 leading-relaxed">
                    매년 11월경 건강보험공단이 보내는 "본인부담상한액 사전 안내문"이나
                    건강보험공단 홈페이지에서 확인할 수 있어요. 잘 모르겠으면 일단{" "}
                    <strong className="text-slate-600">5분위</strong>로 계산해보고,
                    나중에 정확한 분위로 다시 확인해도 괜찮아요.
                  </p>
                  <a
                    href={INCOME_TIER_INFO_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-block text-blue-600 underline"
                  >
                    건강보험공단에서 확인하기
                  </a>
                </details>
              </div>
            </section>
          </form>

          {result && (
            <section className="mt-4 overflow-hidden rounded-3xl bg-white shadow-sm">
              <div className="bg-blue-600 px-5 py-6 text-white">
                <p className="text-xs font-medium text-blue-100">
                  {SUPPORTED_YEAR}년 소득분위 상한액 {formatWon(result.capAmountWon)}
                </p>
                {result.isOverCap ? (
                  <>
                    <p className="mt-1 text-xs text-blue-100">환급 가능 추정액</p>
                    <p className="text-3xl font-bold">{formatWon(result.overageWon)}</p>
                  </>
                ) : (
                  <p className="mt-2 text-lg font-semibold">
                    상한액을 초과하지 않은 것으로 보여요
                  </p>
                )}
              </div>

              <div className="px-5 py-4">
                {!result.isOverCap && (
                  <p className="mb-4 text-sm text-slate-500">
                    의료비가 늘거나 소득분위가 바뀌면 결과도 달라져요. 이 결과를
                    주변에 공유해서 다른 사람도 확인해보게 해주세요.
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleShare}
                  className="mb-2 flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 active:bg-slate-50"
                >
                  <span>
                    {shareStatus === "shared"
                      ? "공유했어요"
                      : shareStatus === "copied"
                        ? "링크가 복사됐어요"
                        : "결과 공유하기"}
                  </span>
                  <span className="text-slate-400">›</span>
                </button>

                {result.isOverCap && (
                  <>
                    <p className="mb-4 text-sm text-slate-500">
                      신청 기한(추정) {formatDate(result.estimatedApplicationDeadline)} ·
                      정확한 기한은 공식 안내로 다시 확인하세요.
                    </p>

                    <button
                      type="button"
                      onClick={handleIcsDownload}
                      className="mb-2 flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 active:bg-slate-50"
                    >
                      <span>캘린더에 신청 기한 저장</span>
                      <span className="text-slate-400">›</span>
                    </button>
                    {icsAttempted && (
                      <p className="mb-3 px-1 text-xs text-slate-400">
                        다운로드가 시작되지 않았다면 캘린더 앱에 직접 추가해주세요:{" "}
                        <strong className="text-slate-600">
                          {formatDate(result.estimatedApplicationDeadline)}
                        </strong>
                      </p>
                    )}
                  </>
                )}

                <a
                  href={OFFICIAL_APPLICATION_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-4 flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 active:bg-slate-50"
                >
                  <span>공식 신청 페이지 바로가기</span>
                  <span className="text-slate-400">›</span>
                </a>

                <div className="rounded-2xl bg-slate-50 px-4 py-4">
                  <p className="mb-1 text-sm font-semibold text-slate-800">체커 플러스</p>
                  <p className="mb-3 text-sm text-slate-600">
                    매년 자동으로 재계산해서 알려드리고, 가족 구성원도 한 번에 관리할
                    수 있어요. 월 1,900원.
                  </p>
                  {paymentStage === "submitted" ? (
                    <div>
                      <p className="text-sm font-medium text-green-700">
                        신청 완료 · 출시되면 가장 먼저 알려드릴게요
                      </p>
                      <p className="mt-1.5 text-xs text-slate-400">
                        메일 앱이 안 열렸다면 신청 내용이 클립보드에 복사돼 있어요 —{" "}
                        <strong className="text-slate-500">{WAITLIST_CONTACT_EMAIL}</strong>로
                        붙여넣어 보내주세요.
                      </p>
                    </div>
                  ) : paymentStage === "collecting" ? (
                    <form onSubmit={handleWaitlistSubmit} className="flex flex-col gap-2">
                      <input
                        type="email"
                        required
                        value={waitlistEmail}
                        onChange={(event) => setWaitlistEmail(event.target.value)}
                        placeholder="이메일 주소"
                        className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-600"
                      />
                      <button
                        type="submit"
                        className="w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white active:bg-slate-800"
                      >
                        신청 완료
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePaymentIntentClick}
                      className="w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white active:bg-slate-800"
                    >
                      미리 신청하기
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}
        </main>

        {/* 하단 고정 CTA — 폼 바깥에서 form 속성으로 제출. 모바일은 엄지로
            바로 누를 수 있게 화면에 고정, 데스크톱은 카드 안쪽 일반 흐름으로
            들어가 떠 있는 버튼이 되지 않게 한다(고정 위치는 폭이 넓어진
            카드의 둥근 모서리와 안 맞아 뜬 느낌이 난다). */}
        <div className="pointer-events-none fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 md:static md:left-auto md:w-full md:max-w-none md:translate-x-0">
          <div className="pointer-events-auto border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur md:rounded-b-3xl">
            <button
              type="submit"
              form="checker-form"
              disabled={!canSubmit}
              className="w-full rounded-2xl bg-blue-600 py-3.5 text-base font-semibold text-white transition disabled:bg-slate-200 disabled:text-slate-400"
            >
              계산하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
