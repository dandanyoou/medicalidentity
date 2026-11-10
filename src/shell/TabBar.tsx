import { Link, useLocation } from "react-router-dom";

/**
 * 하단 탭바 — "뒤로가기 있는 페이지 묶음"을 "앱"으로 만드는 뼈대.
 * 환자(보호자) 화면에서만 보이고, 의사 화면(/doctor)에서는 숨긴다.
 * safe-area(노치/홈바)를 존중한다.
 */
const TABS = [
  { to: "/wallet", label: "홈", match: ["/wallet"], icon: HomeIcon },
  { to: "/billing", label: "진료", match: ["/billing", "/booking"], icon: VisitIcon },
  { to: "/checker", label: "환급", match: ["/checker", "/insurance"], icon: RefundIcon },
  { to: "/family", label: "가족", match: ["/family"], icon: FamilyIcon },
  { to: "/more", label: "더보기", match: ["/more", "/settings", "/subscribe", "/symptom", "/diary", "/labels"], icon: MoreIcon },
] as const;

// /for-hospitals는 병원 담당자가 보는 소개 페이지 — 환자 탭바가 어울리지 않는다.
const HIDDEN_ON = ["/doctor", "/onboarding", "/for-hospitals"];
// 응급 열람 페이지(/e)는 구급대원이 보는 전체 화면 — 정확히 /e 만(응급 잠금화면 /emergency-card는 환자 화면).
const HIDDEN_EXACT = ["/e"];

export function TabBar() {
  const { pathname } = useLocation();
  if (HIDDEN_ON.some((p) => pathname.startsWith(p)) || HIDDEN_EXACT.includes(pathname)) return null;

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-t border-[var(--mist)] bg-[var(--paper)]/95 backdrop-blur md:max-w-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex">
        {TABS.map((t) => {
          const active = t.match.some((m) => pathname.startsWith(m));
          const Icon = t.icon;
          return (
            <li key={t.to} className="flex-1">
              <Link
                to={t.to}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold transition active:scale-95 ${
                  active ? "text-[var(--ink)]" : "text-[var(--ink-2)]/70"
                }`}
              >
                <Icon active={active} />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.15 : 0}
      />
    </svg>
  );
}
function VisitIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="1.8" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0} />
      <path d="M12 9v6M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function RefundIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0} />
      <path d="M12 7.5v9M9.5 10h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function FamilyIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0} />
      <circle cx="16" cy="9.5" r="2.4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 19c.5-3.2 2.8-5 5.5-5s5 1.8 5.5 5M14.5 19c.3-2.2 1.8-3.6 3.8-3.6s2.9 1.2 3.2 3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function MoreIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="6" cy="12" r="1.8" fill="currentColor" opacity={active ? 1 : 0.7} />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" opacity={active ? 1 : 0.7} />
      <circle cx="18" cy="12" r="1.8" fill="currentColor" opacity={active ? 1 : 0.7} />
    </svg>
  );
}
