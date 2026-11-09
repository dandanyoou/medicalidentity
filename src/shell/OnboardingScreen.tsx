import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { markOnboarded } from "./onboarding";
import { BrandMark } from "./BrandMark";

/**
 * 첫 실행 온보딩 — 3장으로 "왜 이 앱인가"를 세운다(토스·삼쩜삼식).
 * 보호자가 가족 의료를 대신 챙긴다는 한 문장이 핵심.
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
    eyebrow: "숨은 돈 찾기",
    title: "낸 병원비,\n돌려받을 수 있어요",
    body: "안 찾아간 의료비 환급과 실손보험 청구를 진료기록에서 바로. 환급 수수료는 0원.",
    accent: "refund",
  },
] as const;

export function OnboardingScreen() {
  useEffect(() => {
    document.title = "시작하기 — 가족 의료지갑";
  }, []);

  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const s = SLIDES[i];

  function finish() {
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
          <button
            type="button"
            onClick={finish}
            className="text-xs font-semibold text-[var(--ink-2)]"
          >
            건너뛰기
          </button>
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
            onClick={() => (last ? finish() : setI((v) => v + 1))}
            className="w-full rounded-2xl bg-[var(--ink)] py-4 text-base font-bold text-white transition active:scale-[0.99] active:brightness-110"
          >
            {last ? "시작하기" : "다음"}
          </button>
        </footer>
      </div>
    </div>
  );
}
