import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { markOnboarded } from "./onboarding";
import { recordConsent } from "./consent";
import { BrandMark } from "./BrandMark";

/**
 * 첫 실행 온보딩 — 3장으로 "왜 이 앱인가"를 세우고(토스·삼쩜삼식), 마지막 장에서
 * 약관·개인정보처리방침 동의와 건강정보(민감정보) 처리 동의를 따로 받는다.
 * 둘 다 체크해야 시작할 수 있다. "건너뛰기"는 동의 장으로 건너뛸 뿐이다.
 */
const SLIDES = [
  {
    eyebrow: "가족 의료지갑",
    title: "멀리 사는 부모님 의료,\n자녀가 대신 챙겨요",
    body: "혈액형·알레르기·복용약부터 환급·진료기록까지. 가족이 앱을 몰라도 괜찮아요.",
    accent: "ink",
  },
  {
    eyebrow: "응급 의료 신원증",
    title: "응급엔 내 몸이\n곧 신분증",
    body: "의식이 없어도 의료진이 혈액형·알레르기를 QR로 바로 확인. 이름·주민번호는 공개하지 않아요.",
    accent: "vital",
  },
  {
    eyebrow: "시작하기 전에",
    title: "건강 정보는\n이 기기에만 저장돼요",
    body: "서버로 보내지 않아요. 건강 정보는 민감정보라 따로 동의를 받아요.",
    accent: "refund",
  },
] as const;

export function OnboardingScreen() {
  useEffect(() => {
    document.title = "시작하기 — 가족 의료지갑";
  }, []);

  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const [terms, setTerms] = useState(false);
  const [health, setHealth] = useState(false);
  const lastIndex = SLIDES.length - 1;
  const last = i === lastIndex;
  const s = SLIDES[i];
  const canStart = terms && health;

  function finish() {
    if (!canStart) return;
    recordConsent({ terms, health });
    markOnboarded();
    navigate("/wallet", { replace: true });
  }

  const accentClass =
    s.accent === "vital"
      ? "bg-[var(--vital)]"
      : s.accent === "refund"
        ? "bg-[var(--refund)]"
        : "bg-[var(--ink)]";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--paper)] md:px-6 md:py-10">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col md:max-w-xl md:min-h-0 md:rounded-[32px] md:bg-[var(--paper)] md:shadow-[0_8px_60px_rgba(11,59,60,0.14)]">
        <header className="flex items-center justify-end px-5 pt-5">
          {!last && (
            <button
              type="button"
              onClick={() => setI(lastIndex)}
              className="text-xs font-semibold text-[var(--ink-2)]"
            >
              건너뛰기
            </button>
          )}
        </header>

        <main className="flex flex-1 flex-col justify-center px-6 pb-8">
          <div
            className={`mb-8 flex h-20 w-20 items-center justify-center rounded-[24px] ${accentClass} shadow-[0_12px_40px_rgba(11,59,60,0.22)]`}
          >
            <BrandMark size={44} />
          </div>

          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--ink-2)]">
            {s.eyebrow}
          </p>
          <h1 className="whitespace-pre-line text-[30px] font-extrabold leading-[1.18] tracking-tight text-[var(--ink)]">
            {s.title}
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--ink-2)]">{s.body}</p>

          {last && (
            <div className="mt-6 flex flex-col gap-2">
              <label className="flex min-h-[44px] items-start gap-3 rounded-2xl bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink)]">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  className="mt-0.5 h-5 w-5 flex-none accent-[var(--ink)]"
                />
                <span>
                  <Link to="/terms" className="font-bold underline">
                    이용약관
                  </Link>
                  과{" "}
                  <Link to="/privacy" className="font-bold underline">
                    개인정보처리방침
                  </Link>
                  에 동의해요 (필수)
                </span>
              </label>
              <label className="flex min-h-[44px] items-start gap-3 rounded-2xl bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink)]">
                <input
                  type="checkbox"
                  checked={health}
                  onChange={(e) => setHealth(e.target.checked)}
                  className="mt-0.5 h-5 w-5 flex-none accent-[var(--ink)]"
                />
                <span>
                  혈액형·알레르기·복용약·증상 같은 <strong>건강 정보</strong>(민감정보)를 이 기기에 기록하는 데
                  동의해요 (필수)
                </span>
              </label>
              <p className="px-1 text-[11px] leading-relaxed text-[var(--ink-2)]">
                만 14세 미만은 보호자 동의가 필요해요. 동의는 설정에서 언제든 철회할 수 있어요.
              </p>
            </div>
          )}
        </main>

        <footer className="px-6 pb-8" style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}>
          <div className="mb-5 flex justify-center gap-1.5" aria-hidden="true">
            {SLIDES.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === i ? "w-6 bg-[var(--ink)]" : "w-1.5 bg-[var(--mist)]"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            disabled={last && !canStart}
            onClick={() => (last ? finish() : setI((v) => v + 1))}
            className="w-full rounded-2xl bg-[var(--ink)] py-4 text-base font-bold text-white transition active:scale-[0.99] active:brightness-110 disabled:bg-[var(--mist)] disabled:text-[var(--ink-2)]"
          >
            {last ? "시작하기" : "다음"}
          </button>
        </footer>
      </div>
    </div>
  );
}
