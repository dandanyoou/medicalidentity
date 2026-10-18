import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckerInputError, computeOverage, type IncomeTier, type OverageResult } from "./calc";
import { buildIcsEvent, triggerIcsDownload } from "./ics";
import { trackCheckerEvent } from "./analytics";

const SUPPORTED_YEAR = 2026;
const OFFICIAL_APPLICATION_URL = "https://www.nhis.or.kr/nhis/minwon/wbhada01000m01.do";

function formatWon(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export function CheckerScreen() {
  const [medicalCost, setMedicalCost] = useState("");
  const [incomeTier, setIncomeTier] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OverageResult | null>(null);
  const [icsAttempted, setIcsAttempted] = useState(false);
  const [paymentClicked, setPaymentClicked] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setIcsAttempted(false);
    setPaymentClicked(false);

    const costNumber = Number(medicalCost);
    const tierNumber = Number(incomeTier);

    try {
      const computed = computeOverage(costNumber, tierNumber as IncomeTier, SUPPORTED_YEAR);
      setResult(computed);
      trackCheckerEvent("checker_completed");
    } catch (err) {
      if (err instanceof CheckerInputError) {
        setError(err.message);
      } else {
        setError("계산 중 알 수 없는 오류가 발생했습니다. 입력값을 확인해주세요.");
      }
    }
  }

  function handleIcsDownload() {
    if (!result) return;
    const ics = buildIcsEvent({
      summary: "본인부담상한제 환급 신청 기한(추정)",
      description: "의료비·시효 체커에서 계산한 추정 신청 기한입니다. 정확한 기한은 공식 안내로 확인하세요.",
      date: result.estimatedApplicationDeadline,
    });
    triggerIcsDownload("환급신청기한.ics", ics);
    trackCheckerEvent("checker_ics_downloaded");
    setIcsAttempted(true);
  }

  function handlePaymentIntentClick() {
    trackCheckerEvent("checker_payment_intent_clicked");
    setPaymentClicked(true);
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">의료비·시효 체커</h1>
        <Link to="/wallet" className="text-sm text-blue-600 underline">
          지갑으로
        </Link>
      </div>

      <p className="mb-6 text-sm text-slate-600">
        본인부담상한제 초과 여부와 환급 신청 기한을 확인하세요. 이 계산기는 입력하신 숫자를
        서버에 저장하지 않습니다 — 모든 계산은 이 기기 안에서만 이루어집니다.
      </p>

      <form onSubmit={handleSubmit} className="mb-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">
            {SUPPORTED_YEAR}년 본인부담 의료비(원)
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={medicalCost}
            onChange={(event) => setMedicalCost(event.target.value)}
            className="rounded border border-slate-300 p-2"
            placeholder="예: 2000000"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">
            건강보험료 소득분위(1~10, 모르면 건강보험공단 안내 참고)
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={10}
            value={incomeTier}
            onChange={(event) => setIncomeTier(event.target.value)}
            className="rounded border border-slate-300 p-2"
            placeholder="예: 3"
          />
        </label>

        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          계산하기
        </button>
      </form>

      {error && (
        <p role="alert" className="mb-6 rounded bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {result && (
        <div className="rounded border border-slate-200 p-4">
          <p className="mb-1 text-sm text-slate-600">
            {SUPPORTED_YEAR}년 소득분위 상한액: {formatWon(result.capAmountWon)}
          </p>

          {result.isOverCap ? (
            <>
              <p className="mb-2 text-lg font-bold text-blue-700">
                환급 가능 추정액: {formatWon(result.overageWon)}
              </p>
              <p className="mb-4 text-sm text-slate-600">
                신청 기한(추정): {formatDate(result.estimatedApplicationDeadline)} — 정확한
                기한은 공식 안내로 다시 확인하세요.
              </p>
            </>
          ) : (
            <p className="mb-4 text-sm text-slate-700">
              입력하신 금액으로는 상한액을 초과하지 않은 것으로 보입니다.
            </p>
          )}

          <a
            href={OFFICIAL_APPLICATION_URL}
            target="_blank"
            rel="noreferrer"
            className="mb-4 block text-sm text-blue-600 underline"
          >
            공식 신청 페이지 바로가기
          </a>

          {result.isOverCap && (
            <div className="mb-4">
              <button
                type="button"
                onClick={handleIcsDownload}
                className="rounded border border-blue-600 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
              >
                캘린더에 신청 기한 저장(.ics)
              </button>
              {icsAttempted && (
                <p className="mt-2 text-xs text-slate-500">
                  다운로드가 시작되지 않았다면, 직접 캘린더 앱에 이 날짜를 추가해주세요:{" "}
                  <strong>{formatDate(result.estimatedApplicationDeadline)}</strong>
                </p>
              )}
            </div>
          )}

          <div className="rounded bg-slate-50 p-3">
            <p className="mb-2 text-sm text-slate-700">
              프리미엄 구독(가칭, 가격 미정) — 환급·보험 청구를 더 편하게 관리하고 싶다면
              관심을 표시해주세요.
            </p>
            {paymentClicked ? (
              <p className="text-sm text-green-700">관심 등록 완료 — 실제 결제는 아직 연동되지 않았습니다.</p>
            ) : (
              <button
                type="button"
                onClick={handlePaymentIntentClick}
                className="rounded bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900"
              >
                결제하기
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
