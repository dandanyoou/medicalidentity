import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { isPremium } from "../subscribe/plan";
import { getInstallState, onInstallStateChange, promptInstall } from "./installPrompt";

/** 더보기 — 탭바의 다섯 번째 탭. 부가 도구·구독·정보를 한 곳에. */
const GROUPS = [
  {
    title: "건강 도구",
    items: [
      { to: "/symptom", label: "증상 정보", desc: "증상으로 진료과 찾기" },
      { to: "/booking", label: "진료 예약", desc: "증상에서 바로 예약", demo: true },
      { to: "/diary", label: "증상 일기", desc: "증상 기록 모아두기" },
    ],
  },
  {
    title: "설정",
    items: [{ to: "/settings", label: "알림 설정", desc: "미납·예약·환급 알림" }],
  },
  {
    title: "데이터",
    items: [{ to: "/labels", label: "라벨링 현황", desc: "검증 라벨 데이터셋" }],
  },
] as const;

export function MoreScreen() {
  useEffect(() => {
    document.title = "더보기 — 가족 의료지갑";
  }, []);
  const premium = isPremium();

  const [install, setInstall] = useState(() => getInstallState());
  useEffect(() => onInstallStateChange(() => setInstall(getInstallState())), []);

  return (
    <div className="min-h-screen bg-[var(--paper)] md:px-6 md:py-10">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-[var(--paper)] md:max-w-xl md:min-h-0 md:overflow-hidden md:rounded-[32px] md:shadow-[0_8px_60px_rgba(11,59,60,0.14)]">
        <header className="sticky top-0 z-10 border-b border-[var(--mist)] bg-[var(--paper)]/92 px-5 py-4 backdrop-blur">
          <h1 className="text-lg font-extrabold tracking-tight text-[var(--ink)]">더보기</h1>
        </header>

        <main className="flex-1 overflow-y-auto px-5 pt-5">
          <Link
            to="/subscribe"
            className="mb-5 flex items-center justify-between rounded-3xl bg-[var(--ink)] px-5 py-4 text-white shadow-[0_10px_34px_rgba(11,59,60,0.28)] transition active:scale-[0.99]"
          >
            <div>
              <p className="text-sm font-bold">
                가족 프리미엄
                {premium && (
                  <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 font-data text-[10px] font-bold">
                    이용 중
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-[11px] text-white/70">
                {premium ? "가족 무제한 · 환급 자동 알림 켜짐" : "가족 무제한 · 환급 자동 재확인 · 월 3,900원"}
              </p>
            </div>
            <span className="font-data text-sm font-bold">{premium ? "관리 →" : "구독 →"}</span>
          </Link>

          {GROUPS.map((g) => (
            <section key={g.title} className="mb-5">
              <p className="mb-2 px-1 font-data text-[10px] uppercase tracking-[0.2em] text-[var(--ink-2)]">
                {g.title}
              </p>
              <div className="overflow-hidden rounded-3xl bg-[var(--surface)] shadow-[0_1px_12px_rgba(11,59,60,0.07)]">
                {g.items.map((it, idx) => (
                  <Link
                    key={it.to}
                    to={it.to}
                    className={`flex items-center justify-between px-5 py-4 transition active:bg-[var(--paper)] ${
                      idx > 0 ? "border-t border-[var(--mist)]" : ""
                    }`}
                  >
                    <div>
                      <p className="text-sm font-bold text-[var(--ink)]">
                        {it.label}
                        {"demo" in it && it.demo && (
                          <span className="ml-1.5 font-data text-[9px] font-medium text-[var(--ink-2)]">
                            시연
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[var(--ink-2)]">{it.desc}</p>
                    </div>
                    <span className="text-[var(--ink-2)]">›</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}

          <section className="mb-5">
            <p className="mb-2 px-1 font-data text-[10px] uppercase tracking-[0.2em] text-[var(--ink-2)]">
              의료진
            </p>
            <Link
              to="/doctor"
              target="_blank"
              className="flex items-center justify-between rounded-3xl bg-[var(--surface)] px-5 py-4 shadow-[0_1px_12px_rgba(11,59,60,0.07)] transition active:bg-[var(--paper)]"
            >
              <div>
                <p className="text-sm font-bold text-[var(--ink)]">의사 화면</p>
                <p className="mt-0.5 text-[11px] text-[var(--ink-2)]">환자 QR 검증 · 처방 안전 확인</p>
              </div>
              <span className="text-[var(--ink-2)]">↗</span>
            </Link>
          </section>

          {/* 홈 화면 설치 — 플랫폼별로 지금 할 수 있는 한 가지만 */}
          <section className="mb-5 flex items-center justify-between gap-3 rounded-3xl bg-[var(--surface)] px-5 py-4 shadow-[0_1px_12px_rgba(11,59,60,0.07)]">
            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--ink)]">
                {install === "installed" ? "홈 화면 앱으로 쓰는 중" : "홈 화면에 추가"}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--ink-2)]">
                {install === "installed" && "오프라인에서도 응급 신원증을 바로 열 수 있어요."}
                {install === "promptable" && "앱처럼 설치하면 오프라인에서도 열려요."}
                {install === "ios" && (
                  <>
                    Safari 하단 <strong className="text-[var(--ink)]">공유</strong> 버튼 →{" "}
                    <strong className="text-[var(--ink)]">홈 화면에 추가</strong>를 누르면 설치돼요.
                  </>
                )}
                {install === "manual" && (
                  <>
                    브라우저 메뉴에서 <strong className="text-[var(--ink)]">홈 화면에 추가</strong>(또는
                    앱 설치)를 누르면 앱처럼 쓸 수 있어요.
                  </>
                )}
              </p>
            </div>
            {install === "installed" ? (
              <span className="flex-none rounded-full bg-[var(--refund)]/12 px-2.5 py-1 font-data text-[10px] font-bold text-[var(--refund-ink)]">
                설치됨 ✓
              </span>
            ) : install === "promptable" ? (
              <button
                type="button"
                onClick={() => void promptInstall()}
                className="flex-none rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-bold text-white active:brightness-110"
              >
                설치
              </button>
            ) : null}
          </section>

          <section className="mb-5">
            <p className="mb-2 px-1 font-data text-[10px] uppercase tracking-[0.2em] text-[var(--ink-2)]">
              약관·정책
            </p>
            <div className="overflow-hidden rounded-3xl bg-[var(--surface)] shadow-[0_1px_12px_rgba(11,59,60,0.07)]">
              <Link to="/terms" className="flex items-center justify-between px-5 py-4 transition active:bg-[var(--paper)]">
                <p className="text-sm font-bold text-[var(--ink)]">이용약관</p>
                <span className="text-[var(--ink-2)]">›</span>
              </Link>
              <Link
                to="/privacy"
                className="flex items-center justify-between border-t border-[var(--mist)] px-5 py-4 transition active:bg-[var(--paper)]"
              >
                <p className="text-sm font-bold text-[var(--ink)]">개인정보처리방침</p>
                <span className="text-[var(--ink-2)]">›</span>
              </Link>
            </div>
          </section>

          <section className="rounded-3xl bg-[var(--surface)] px-5 py-4 text-[11px] leading-relaxed text-[var(--ink-2)] shadow-[0_1px_12px_rgba(11,59,60,0.07)]">
            <p className="font-data text-[10px] uppercase tracking-[0.2em]">앱 정보</p>
            <p className="mt-1 text-[var(--ink)]">가족 의료지갑 · v0.1.0</p>
            <p className="mt-2">
              건강 정보는 이 기기에만 저장되며 서버로 전송되지 않습니다(결제 시 주문번호·금액만
              토스페이먼츠로). "시연" 표시 기능은 병원·보험사·결제 연동 전의 흐름 미리보기입니다.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
