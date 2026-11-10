import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BrandMark } from "../shell/BrandMark";
import { DashboardPanel } from "./DashboardPanel";
import {
  REASON_TEXT,
  ROLE_LABEL,
  badgeCode,
  currentSession,
  getHospital,
  issueBadge,
  listBadges,
  loginWithBadge,
  logout,
  registerHospital,
  revokeBadge,
  type HospitalRegistration,
  type Role,
  type Session,
  type StoredBadge,
} from "./badge";

/**
 * 병원 포털(/hospital) — 병원 등록 → 직원 배지 발급 → 배지 로그인 · 폐기. 시연.
 * 의사 화면(/doctor)은 여기서 로그인한 뒤에만 열린다.
 */
export function HospitalPortalScreen() {
  const [hospital, setHospital] = useState<HospitalRegistration | null>(() => getHospital());
  const [badges, setBadges] = useState<StoredBadge[]>(() => listBadges());
  const [session, setSession] = useState<Session | null>(() => currentSession());
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "병원 포털 — 가족 의료지갑";
  }, []);

  function refresh() {
    setBadges(listBadges());
    setSession(currentSession());
  }

  async function login(code: string) {
    setLoginError(null);
    const r = await loginWithBadge(code);
    if (!r.ok) setLoginError(REASON_TEXT[r.reason]);
    refresh();
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="mx-auto w-full max-w-md px-5 pb-16 pt-5 md:max-w-2xl md:px-8">
        <header className="flex items-center justify-between">
          <Link to="/for-hospitals" className="flex items-center gap-2 text-sm font-bold">
            <BrandMark size={26} />
            병원 포털
          </Link>
          <span className="rounded-full border border-[var(--mist)] bg-[var(--surface)] px-3 py-1 text-[11px] font-bold text-[var(--ink-2)]">
            시연 · 이 기기에만 저장
          </span>
        </header>

        {!hospital ? (
          <RegisterForm onDone={(h) => { setHospital(h); refresh(); }} />
        ) : (
          <>
            <section className="mt-8">
              <p className="font-data text-[11px] uppercase tracking-[0.2em] text-[var(--ink-2)]">등록 병원</p>
              <h1 className="mt-2 text-[28px] font-bold leading-tight tracking-[-0.02em]">{hospital.name}</h1>
              <p className="mt-1 text-sm text-[var(--ink-2)]">
                관리자 {hospital.admin} · <strong className="text-[var(--refund-ink)]">인증됨(시연)</strong>
              </p>
              <p className="mt-3 text-xs leading-relaxed text-[var(--ink-2)]">
                실제 서비스에서는 요양기관 대조·사업자등록증·대표 전화 확인을 거친 뒤 인증됩니다. 지금은 그 자리만
                있고, 병원 키와 배지는 이 기기 저장소에 평문으로 있습니다(출시 전 서버 보관으로 바꿉니다).
              </p>
            </section>

            <SessionCard session={session} onLogout={() => { logout(); refresh(); }} />

            {session && <DashboardPanel />}

            <IssueForm onIssued={refresh} />

            <section aria-labelledby="badges-h" className="mt-8">
              <h2 id="badges-h" className="text-base font-bold">직원 배지</h2>
              {badges.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--ink-2)]">아직 발급한 배지가 없어요.</p>
              ) : (
                <ul aria-label="직원 배지 목록" className="mt-3 space-y-2">
                  {badges.map((b) => (
                    <BadgeRow
                      key={b.id}
                      badge={b}
                      active={session?.badgeId === b.id}
                      onLogin={() => login(badgeCode(b))}
                      onRevoke={() => { revokeBadge(b.id); refresh(); }}
                    />
                  ))}
                </ul>
              )}
            </section>

            <PasteLogin onLogin={login} error={loginError} />
          </>
        )}
      </div>
    </div>
  );
}

function RegisterForm({ onDone }: { onDone: (h: HospitalRegistration) => void }) {
  const [name, setName] = useState("");
  const [admin, setAdmin] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const ready = name.trim() && admin.trim() && confirmed;
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (ready) onDone(registerHospital({ name, admin })); }}
      className="mt-8 space-y-4"
    >
      <div>
        <p className="font-data text-[11px] uppercase tracking-[0.2em] text-[var(--ink-2)]">1 / 3</p>
        <h1 className="mt-2 text-[28px] font-bold leading-tight tracking-[-0.02em]">병원 등록</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-2)]">
          등록하면 이 기기에 병원 키가 만들어지고, 관리자가 직원 배지를 발급할 수 있어요. 사업자등록번호·면허번호는
          시연이라 받지 않습니다.
        </p>
      </div>
      <Field id="h-name" label="병원 이름" value={name} onChange={setName} placeholder="예: 행복의원" />
      <Field id="h-admin" label="관리자 이름" value={admin} onChange={setAdmin} placeholder="원장 또는 원무 책임자" />
      <label className="flex items-start gap-3 rounded-2xl bg-[var(--surface)] px-4 py-3 text-sm">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1 h-4 w-4" />
        <span>
          이 병원의 관리자이며, 직원에게 배지를 발급할 권한이 있습니다. <span className="text-[var(--ink-2)]">(시연 — 실제 확인 절차는 출시 전에)</span>
        </span>
      </label>
      <button
        type="submit"
        disabled={!ready}
        className="h-12 w-full rounded-full bg-[var(--ink)] text-sm font-extrabold text-white disabled:bg-[var(--mist)] disabled:text-[var(--ink-2)]"
      >
        병원 등록
      </button>
    </form>
  );
}

function IssueForm({ onIssued }: { onIssued: () => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("doctor");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; issueBadge({ name, role }); setName(""); onIssued(); }}
      className="mt-8 rounded-2xl border border-[var(--mist)] bg-[var(--surface)] p-5"
    >
      <h2 className="text-base font-bold">배지 발급</h2>
      <p className="mt-1 text-xs leading-relaxed text-[var(--ink-2)]">
        배지에는 발급 병원·이름·역할·만료(180일)만 들어가고 병원 키로 서명돼요. 환자 정보는 없어요. 의사 역할만
        진단서·소견서에 서명할 수 있어요(서류 발급은 준비 중).
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px]">
        <Field id="b-name" label="직원 이름" value={name} onChange={setName} placeholder="예: 김의사" />
        <label htmlFor="b-role" className="block">
          <span className="text-xs font-bold text-[var(--ink-2)]">역할</span>
          <select
            id="b-role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="mt-1 h-11 w-full rounded-xl border border-[var(--mist)] bg-[var(--paper)] px-3 text-sm"
          >
            <option value="doctor">의사</option>
            <option value="staff">간호·원무</option>
          </select>
        </label>
      </div>
      <button type="submit" className="mt-4 h-11 w-full rounded-full bg-[var(--ink)] text-sm font-extrabold text-white">
        배지 발급
      </button>
    </form>
  );
}

function BadgeRow({ badge, active, onLogin, onRevoke }: { badge: StoredBadge; active: boolean; onLogin: () => void; onRevoke: () => void }) {
  const [copied, setCopied] = useState(false);
  const revoked = badge.status === "revoked";
  const exp = new Date(badge.exp * 1000).toLocaleDateString("ko-KR");
  return (
    <li className={`rounded-2xl border px-4 py-3 ${revoked ? "border-[var(--mist)] bg-[var(--paper)] opacity-70" : "border-[var(--mist)] bg-[var(--surface)]"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold">
            {badge.name} <span className="font-medium text-[var(--ink-2)]">· {ROLE_LABEL[badge.role]}</span>
          </p>
          <p className="text-[11px] text-[var(--ink-2)]">
            {revoked ? "폐기됨" : `만료 ${exp}`}
            {active && !revoked && <span className="ml-2 font-bold text-[var(--refund-ink)]">로그인 중</span>}
          </p>
        </div>
        {!revoked && (
          <div className="flex flex-none gap-2">
            <button
              type="button"
              onClick={async () => {
                try { await navigator.clipboard?.writeText(badgeCode(badge)); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* 클립보드 없음 */ }
              }}
              className="rounded-full border border-[var(--mist)] px-3 py-1.5 text-xs font-bold"
            >
              {copied ? "복사됨" : "코드 복사"}
            </button>
            {!active && (
              <button type="button" onClick={onLogin} className="rounded-full bg-[var(--ink)] px-3 py-1.5 text-xs font-bold text-white">
                이 배지로 로그인
              </button>
            )}
            <button type="button" onClick={onRevoke} className="rounded-full px-2 py-1.5 text-xs font-bold text-[var(--vital-ink)]">
              폐기
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function SessionCard({ session, onLogout }: { session: Session | null; onLogout: () => void }) {
  if (!session) {
    return (
      <p className="mt-6 rounded-2xl bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink-2)]">
        아직 배지 로그인이 없어요. 아래에서 배지를 발급하고 "이 배지로 로그인"을 누르면 의사 화면이 열려요.
      </p>
    );
  }
  return (
    <div role="status" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--ink)] px-5 py-4 text-white">
      <div>
        <p className="text-sm font-bold">{session.name} · {ROLE_LABEL[session.role]}</p>
        <p className="text-[11px] text-white/70">{session.hospitalName} 배지로 로그인 중</p>
      </div>
      <div className="flex gap-2">
        <Link to="/doctor" className="rounded-full bg-[var(--refund)] px-4 py-2 text-xs font-extrabold text-[var(--ink-deep)]">
          의사 화면 열기
        </Link>
        <button type="button" onClick={onLogout} className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold">
          로그아웃
        </button>
      </div>
    </div>
  );
}

function PasteLogin({ onLogin, error }: { onLogin: (code: string) => void; error: string | null }) {
  const [code, setCode] = useState("");
  return (
    <section className="mt-8 rounded-2xl border border-[var(--mist)] bg-[var(--surface)] p-5">
      <h2 className="text-base font-bold">다른 기기에서 받은 배지로 로그인</h2>
      <p className="mt-1 text-xs text-[var(--ink-2)]">관리자가 복사해 준 배지 코드를 붙여넣으세요. 이 기기에 등록된 병원이 발급한 배지만 통과해요.</p>
      <label htmlFor="paste-code" className="mt-3 block">
        <span className="text-xs font-bold text-[var(--ink-2)]">배지 코드</span>
        <textarea
          id="paste-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-[var(--mist)] bg-[var(--paper)] px-3 py-2 font-data text-xs"
        />
      </label>
      {error && (
        <p role="alert" className="mt-2 rounded-xl bg-[var(--vital)]/10 px-3 py-2 text-xs font-bold text-[var(--vital-ink)]">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={!code.trim()}
        onClick={() => onLogin(code)}
        className="mt-3 h-11 w-full rounded-full border border-[var(--ink)] text-sm font-extrabold disabled:border-[var(--mist)] disabled:text-[var(--ink-2)]"
      >
        코드로 로그인
      </button>
    </section>
  );
}

function Field({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-xs font-bold text-[var(--ink-2)]">{label}</span>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 h-11 w-full rounded-xl border border-[var(--mist)] bg-[var(--paper)] px-3 text-sm outline-none focus:border-[var(--ink)]"
      />
    </label>
  );
}
