import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { decodeTier1, verifyTier1, type Tier1Envelope } from "./lockscreen";
import { formatPhone } from "../family/verify";

/**
 * /e — 구급대원·의료진이 잠금화면 QR을 아무 카메라로 읽으면 열리는 보통 웹페이지.
 * 로그인·앱 설치 없이, 주소 #뒤의 서명된 1층 정보를 기기 안에서 검증해 크게 보여준다.
 * 서버는 아무것도 받지 않는다(#뒤는 전송되지 않음).
 *
 * 2층(진료 이력·복용약 전체)은 설계상 응급 기관 확인 또는 가족 승인이 있어야 열린다 — 서버가
 * 필요해 아직 없다. 숨기지 않고 "준비 중"이라고 말한다.
 */
type State =
  | { kind: "empty" }
  | { kind: "checking" }
  | { kind: "broken" }
  | { kind: "untrusted" }
  | { kind: "ok"; env: Tier1Envelope };

export function EmergencyViewScreen() {
  useEffect(() => {
    document.title = "응급 의료정보 — 가족 의료지갑";
  }, []);

  const { hash } = useLocation();
  const [state, setState] = useState<State>(() => (hash && hash.length > 1 ? { kind: "checking" } : { kind: "empty" }));

  useEffect(() => {
    if (!hash || hash.length <= 1) {
      setState({ kind: "empty" });
      return;
    }
    let alive = true;
    const env = decodeTier1(`x${hash}`);
    if (!env) {
      setState({ kind: "broken" });
      return;
    }
    verifyTier1(env).then((ok) => {
      if (!alive) return;
      setState(ok ? { kind: "ok", env } : { kind: "untrusted" });
    });
    return () => {
      alive = false;
    };
  }, [hash]);

  const created = useMemo(
    () => (state.kind === "ok" ? new Date(state.env.iat * 1000).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" }) : ""),
    [state],
  );

  return (
    <div className="min-h-screen bg-[var(--ink)] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-6">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-data text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">가족 의료지갑</p>
            <h1 className="text-xl font-extrabold tracking-tight">응급 의료정보</h1>
          </div>
          <a
            href="tel:119"
            className="flex min-h-[44px] items-center rounded-2xl bg-[var(--vital)] px-4 text-sm font-extrabold text-white active:brightness-95"
          >
            119 전화
          </a>
        </header>

        <main className="flex-1">
          {state.kind === "empty" && (
            <section className="rounded-3xl bg-white/[0.07] p-5 ring-1 ring-white/10">
              <p className="text-base font-bold">환자 잠금화면의 QR을 읽어서 열어주세요.</p>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                이 페이지는 QR 안에 담긴 정보를 보여주는 곳이에요. QR 없이 열면 보여줄 정보가 없어요.
              </p>
            </section>
          )}

          {state.kind === "checking" && (
            <p className="rounded-3xl bg-white/[0.07] p-5 text-sm text-white/70 ring-1 ring-white/10" aria-live="polite">
              정보를 확인하는 중…
            </p>
          )}

          {(state.kind === "broken" || state.kind === "untrusted") && (
            <section role="alert" className="rounded-3xl border-l-4 border-[var(--vital)] bg-white/[0.07] p-5 ring-1 ring-white/10">
              <p className="text-base font-bold">
                {state.kind === "broken" ? "이 QR은 읽을 수 없어요." : "이 정보는 신뢰할 수 없어요."}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                {state.kind === "broken"
                  ? "주소가 잘렸거나 다른 QR이에요. 다시 읽어 보세요."
                  : "내용이 만들어진 뒤 바뀌었어요(서명 불일치). 이 화면의 정보로 판단하지 마세요."}
              </p>
            </section>
          )}

          {state.kind === "ok" && (
            <>
              <div className="mb-3 flex items-center gap-2 text-[11px] text-white/70">
                <span className="rounded-full bg-[var(--refund)]/25 px-2 py-0.5 font-data font-bold text-[var(--refund)]">
                  변조 없음
                </span>
                <span>본인 기기에서 {created} 생성</span>
              </div>

              {state.env.t1.blood && (
                <section className="rounded-3xl bg-white p-5 text-[var(--ink)]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--ink-2)]">혈액형</p>
                  <p className="mt-1 font-data text-[64px] font-bold leading-none tracking-tight">{state.env.t1.blood}</p>
                </section>
              )}

              {state.env.t1.allergens && state.env.t1.allergens.length > 0 && (
                <section className="mt-3 rounded-3xl border-l-8 border-[var(--vital)] bg-white p-5 text-[var(--ink)]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--vital-ink)]">알레르기</p>
                  <ul className="mt-1 text-2xl font-extrabold leading-tight">
                    {state.env.t1.allergens.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </section>
              )}

              {state.env.t1.meds && state.env.t1.meds.length > 0 && (
                <section className="mt-3 rounded-3xl bg-white/[0.07] p-5 ring-1 ring-white/10">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">복용 중인 약</p>
                  <ul className="mt-1 text-lg font-bold">
                    {state.env.t1.meds.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </section>
              )}

              {state.env.t1.contact && (
                <a
                  href={`tel:${state.env.t1.contact.phone}`}
                  className="mt-3 flex min-h-[56px] items-center justify-between rounded-3xl bg-white/[0.07] px-5 py-4 ring-1 ring-white/10 active:bg-white/15"
                >
                  <span>
                    <span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">비상연락</span>
                    <span className="block text-lg font-bold">
                      {state.env.t1.contact.label} {formatPhone(state.env.t1.contact.phone)}
                    </span>
                  </span>
                  <span className="font-data text-sm font-bold text-[var(--refund)]">전화 →</span>
                </a>
              )}

              <section className="mt-4 rounded-3xl bg-white/[0.05] p-4 text-xs leading-relaxed text-white/60 ring-1 ring-white/10">
                <p className="font-bold text-white/80">진료 이력·복용약 전체 — 준비 중</p>
                <p className="mt-1">
                  응급 기관 확인(119·응급실 자격) 또는 환자 가족의 승인이 있어야 열리도록 설계돼 있어요. 지금은 환자
                  본인이 잠금화면에 담기로 고른 정보만 보여요.
                </p>
              </section>
            </>
          )}

          <p className="mt-6 text-[11px] leading-relaxed text-white/50">
            이 정보는 환자 본인이 기기에 적어 둔 것으로, 기관이 발급한 증명이 아니며 의료 조언이 아니에요. 응급 처치는
            현장 의료진의 판단을 따르세요. 서버로 전송되는 정보는 없어요.
          </p>
        </main>
      </div>
    </div>
  );
}
