import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSettings, setSetting, type Settings } from "./store";
import { isPremium } from "../subscribe/plan";

/**
 * 알림 설정 — 토스/보맵식 토글 리스트.
 * 환급 자동 재확인은 프리미엄 기능: 미구독이면 켜지 않고 구독 안내로.
 */
export function SettingsScreen() {
  useEffect(() => {
    document.title = "알림 설정 — 가족 의료지갑";
  }, []);

  const [s, setS] = useState<Settings>(() => getSettings());
  const [upsell, setUpsell] = useState(false);
  const premium = isPremium();

  function toggle(key: keyof Settings) {
    if (key === "refundAutoCheck" && !premium && !s.refundAutoCheck) {
      setUpsell(true);
      return;
    }
    setS(setSetting(key, !s[key]));
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] md:px-6 md:py-10">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-[var(--paper)] md:max-w-xl md:min-h-0 md:overflow-hidden md:rounded-[32px] md:shadow-[0_8px_60px_rgba(11,59,60,0.14)]">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--mist)] bg-[var(--paper)]/92 px-5 py-4 backdrop-blur">
          <Link
            to="/more"
            aria-label="더보기로 돌아가기"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink-2)] hover:bg-[var(--surface)]"
          >
            ‹
          </Link>
          <h1 className="text-base font-extrabold tracking-tight text-[var(--ink)]">알림 설정</h1>
        </header>

        <main className="flex-1 overflow-y-auto px-5 pt-5">
          <p className="mb-4 rounded-2xl border-l-4 border-[var(--ink)] bg-[var(--surface)] px-4 py-3 text-xs leading-relaxed text-[var(--ink-2)]">
            <strong className="text-[var(--ink)]">푸시 알림은 준비 중입니다.</strong> 지금은 설정만
            저장돼요. 홈 화면에 앱을 설치하고 알림 권한을 허용하면, 푸시 서버 연동 후 바로
            동작합니다.
          </p>

          <div className="overflow-hidden rounded-3xl bg-[var(--surface)] shadow-[0_1px_12px_rgba(11,59,60,0.07)]">
            <Row
              title="병원 이탈 시 미납 알림"
              desc="병원을 나설 때 안 낸 진료비가 있으면 알려드려요"
              on={s.unpaidAlert}
              onToggle={() => toggle("unpaidAlert")}
            />
            <Row
              title="예약 전날 리마인더"
              desc="진료 예약 하루 전에 알려드려요"
              on={s.bookingReminder}
              onToggle={() => toggle("bookingReminder")}
              divider
            />
            <Row
              title="매년 환급 자동 재확인"
              desc={premium ? "가족 모두의 환급 대상 여부를 매년 확인해요" : "프리미엄에서 켤 수 있어요"}
              on={s.refundAutoCheck}
              onToggle={() => toggle("refundAutoCheck")}
              badge={premium ? undefined : "프리미엄"}
              divider
            />
          </div>

          {upsell && (
            <Link
              to="/subscribe"
              className="mt-4 block rounded-2xl border-l-4 border-[var(--refund)] bg-[var(--surface)] px-4 py-3 shadow-[0_1px_12px_rgba(11,59,60,0.07)]"
            >
              <p className="text-sm font-bold text-[var(--ink)]">환급 자동 재확인은 프리미엄 기능이에요</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--ink-2)]">
                가족 프리미엄(월 3,900원)으로 바꾸면 매년 가족 모두의 환급을 자동으로 챙겨드려요.{" "}
                <span className="font-bold text-[var(--refund-ink)]">구독하기 →</span>
              </p>
            </Link>
          )}
        </main>
      </div>
    </div>
  );
}

function Row({
  title,
  desc,
  on,
  onToggle,
  badge,
  divider,
}: {
  title: string;
  desc: string;
  on: boolean;
  onToggle: () => void;
  badge?: string;
  divider?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-5 py-4 ${
        divider ? "border-t border-[var(--mist)]" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-bold text-[var(--ink)]">
          {title}
          {badge && (
            <span className="ml-2 rounded-full bg-[var(--refund)]/12 px-2 py-0.5 font-data text-[9px] font-bold text-[var(--refund-ink)]">
              {badge}
            </span>
          )}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--ink-2)]">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={title}
        onClick={onToggle}
        className={`flex h-7 w-12 flex-none items-center rounded-full p-0.5 transition ${
          on ? "bg-[var(--ink)]" : "bg-[var(--mist)]"
        }`}
      >
        <span
          className={`h-6 w-6 rounded-full bg-white shadow transition ${
            on ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
