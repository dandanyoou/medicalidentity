import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "qrcode";
import { getPatientVCs, type PatientVCs } from "../data/patient-vcs";
import { buildBundle, buildVPPayload } from "./bundle";
import { listMembers, getMember, SELF_ID, type FamilyMember } from "../family/store";
import { isPremium } from "../subscribe/plan";
import { unpaidVisits, listVisits } from "../visits/store";
import { getClaimByVisit } from "../insurance/store";
import { CountUp } from "../shell/CountUp";
import { BottomSheet } from "../shell/BottomSheet";
import { Skeleton } from "../shell/Skeleton";

/**
 * 가족 환자 의료지갑 — 보호자(자녀)가 가족 구성원의 의료를 한 곳에서 관리.
 *
 * 시그니처: 응급 의료 신원증을 다크 잉크 크레덴셜 카드로 — 밝은 나머지 UI 위에서
 * 이 한 장이 튄다. 혈액형이 히어로 데이텀(응급에서 제일 먼저 보는 정보).
 * 예약·수납은 병원 연동이 없으므로 '시연'으로 명확히 표시한다.
 */
export function WalletScreen() {
  useEffect(() => {
    document.title = "가족 의료지갑 — 신원 · 환급 · 예약";
  }, []);

  const members = listMembers();
  const [selectedId, setSelectedId] = useState<string>(SELF_ID);
  const selected: FamilyMember = getMember(selectedId) ?? members[0];
  const isSelf = selected.id === SELF_ID;

  // 오늘 챙길 것 — 토스식 개인화 액션 피드(금액 포함).
  const unpaid = unpaidVisits(SELF_ID);
  const unpaidTotal = unpaid.reduce((s, v) => s + v.amount, 0);
  const claimable = listVisits(SELF_ID).filter((v) => v.amount > 0 && !getClaimByVisit(v.id));
  const upcoming = listVisits(SELF_ID).filter((v) => v.status === "예약");

  const [vcs, setVCs] = useState<PatientVCs | null>(null);
  const [emergencyOn, setEmergencyOn] = useState(false);
  // 공개 전 확인 바텀시트 — 실수로 응급 정보를 공개하는 일을 막는다. 중단은 즉시.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [qrDataUrl, setQRDataUrl] = useState<string | null>(null);
  const [vpCompact, setVpCompact] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    getPatientVCs()
      .then(setVCs)
      .catch((e) => setSeedError(`VC seed 실패: ${(e as Error).message}`));
  }, []);

  useEffect(() => {
    if (!emergencyOn || !isSelf || !vcs) {
      setQRDataUrl(null);
      setVpCompact(null);
      setQrError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { qr, compact } = await buildEmergencyQR(vcs);
        if (cancelled) return;
        setQRDataUrl(qr);
        setVpCompact(compact);
        setQrError(null);
        navigator.clipboard?.writeText(compact).catch(() => {});
      } catch (e) {
        if (cancelled) return;
        const msg = (e as Error)?.message ?? String(e);
        try {
          const compact = await buildVPPayload(vcs);
          if (cancelled) return;
          setVpCompact(compact);
          setQRDataUrl(null);
          setQrError(`QR 인코딩 실패: ${msg}. 페이로드 복사로 의사 화면에 붙여넣으세요.`);
          navigator.clipboard?.writeText(compact).catch(() => {});
        } catch (inner) {
          if (cancelled) return;
          setQrError(`VP 생성 실패: ${(inner as Error).message}`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [emergencyOn, isSelf, vcs]);

  function selectMember(id: string) {
    setSelectedId(id);
    setEmergencyOn(false);
  }

  const copy = () => {
    if (!vpCompact) return;
    navigator.clipboard.writeText(vpCompact).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (seedError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--paper)] p-6">
        <div className="rounded-2xl border-l-4 border-[var(--vital)] bg-[var(--surface)] px-5 py-4 text-sm text-[var(--vital-ink)] shadow-sm">
          {seedError}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--paper)] md:px-6 md:py-10">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-[var(--paper)] md:max-w-xl md:min-h-0 md:overflow-hidden md:rounded-[32px] md:shadow-[0_8px_60px_rgba(11,59,60,0.14)]">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--mist)] bg-[var(--paper)]/92 px-5 py-4 backdrop-blur">
          <div>
            <p className="font-data text-[10px] uppercase tracking-[0.22em] text-[var(--ink-2)]">
              가족 의료지갑
            </p>
            <h1 className="text-lg font-extrabold tracking-tight text-[var(--ink)]">
              우리 가족 의료
            </h1>
          </div>
          <Link
            to="/doctor"
            target="_blank"
            className="flex-none rounded-full border border-[var(--mist)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-2)] active:bg-[var(--paper)]"
          >
            의사 화면 →
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto px-5 pb-10 pt-4">
          {/* ───────── 가족 구성원 전환 ───────── */}
          <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
            {members.map((m) => {
              const active = m.id === selected.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => selectMember(m.id)}
                  aria-pressed={active}
                  className={`flex flex-none items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-bold transition ${
                    active
                      ? "bg-[var(--ink)] text-white"
                      : "border border-[var(--mist)] bg-[var(--surface)] text-[var(--ink-2)]"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      active ? "bg-white/15 text-white" : "bg-[var(--paper)] text-[var(--ink)]"
                    }`}
                  >
                    {m.name.slice(0, 1)}
                  </span>
                  {m.name}
                  <span className="text-[11px] font-medium opacity-70">{m.relation}</span>
                </button>
              );
            })}
            <Link
              to="/family"
              className="flex flex-none items-center rounded-full border border-dashed border-[var(--mist)] px-4 py-2 text-sm font-bold text-[var(--ink-2)] active:bg-[var(--surface)]"
            >
              + 가족
            </Link>
          </div>

          {/* ───────── 응급 의료 신원증 (시그니처 · 다크 크레덴셜) ───────── */}
          <section
            className="relative overflow-hidden rounded-[28px] text-white shadow-[0_14px_44px_rgba(7,42,43,0.34)]"
            style={{ background: "linear-gradient(158deg, var(--ink) 0%, var(--ink-deep) 100%)" }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                background:
                  "repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 7px)",
              }}
            />
            <div className="relative px-6 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="vital-dot h-2 w-2 rounded-full bg-[var(--vital)]" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--vital-2)]">
                    응급 의료 신원증
                  </span>
                </div>
                <span className="font-data text-[10px] text-white/55">
                  {!isSelf ? "시연 프로필" : vcs ? "SD-JWT ✓" : <Skeleton light className="h-3 w-14 align-middle" />}
                </span>
              </div>

              <h2 className="mt-4 text-[28px] font-extrabold leading-none tracking-tight">
                {selected.name}
                <span className="ml-2 align-middle text-sm font-bold text-white/55">
                  {selected.relation}
                </span>
              </h2>

              {/* 혈액형 = 히어로 데이텀 */}
              <div className="mt-5 flex items-stretch gap-3">
                <div className="flex-none rounded-2xl bg-white/[0.07] px-5 py-3 text-center ring-1 ring-white/10">
                  <div className="font-data text-[44px] font-bold leading-none">
                    {selected.blood}
                    <span className="text-[var(--vital-2)]">{selected.rh}</span>
                  </div>
                  <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                    혈액형
                  </div>
                </div>
                <div className="flex-1 rounded-2xl bg-white/[0.07] px-4 py-3 ring-1 ring-white/10">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                    알레르기
                  </div>
                  <div className="font-data text-base font-bold text-[var(--vital-2)]">
                    {selected.allergen ?? "없음"}
                    {selected.severity ? ` · ${selected.severity}` : ""}
                  </div>
                  {selected.meds && selected.meds.length > 0 && (
                    <>
                      <div className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-white/50">
                        복용약
                      </div>
                      <div className="font-data text-[13px] text-white/90">
                        {selected.meds.join(", ")}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {isSelf ? (
                <>
                  <button
                    onClick={() => (emergencyOn ? setEmergencyOn(false) : setConfirmOpen(true))}
                    aria-pressed={emergencyOn}
                    disabled={!vcs}
                    className={`mt-5 w-full rounded-2xl py-3.5 text-base font-bold tracking-tight transition ${
                      emergencyOn
                        ? "bg-white/10 text-white ring-1 ring-white/25 active:bg-white/15"
                        : "bg-[var(--vital)] text-white active:brightness-95 disabled:opacity-60"
                    }`}
                  >
                    {emergencyOn ? "공개 중단" : vcs ? "응급 공개 · QR 생성" : "신원 자료 준비 중…"}
                  </button>
                  <p className="mt-2 text-center text-[11px] leading-relaxed text-white/55">
                    혈액형 + 알레르기만 공개합니다. 이름·주민번호·주소는 공개되지 않아요.
                  </p>
                </>
              ) : (
                <p className="mt-5 rounded-2xl bg-white/[0.07] px-4 py-3 text-center text-xs leading-relaxed text-white/70 ring-1 ring-white/10">
                  가족 데모 프로필입니다. 실제 응급 QR(SD-JWT 서명)은 본인 프로필에서만
                  생성됩니다. 가족의 실제 발급은 추후 병원·기관 연동으로 열립니다.
                </p>
              )}
            </div>

            {isSelf && emergencyOn && (
              <div className="animate-reveal-in relative border-t border-white/10 px-6 py-5">
                {qrDataUrl && (
                  <div>
                    <p className="mb-3 text-xs text-white/70">
                      의료진에게 QR을 보여주거나 아래 페이로드를 복사해 의사 화면에
                      붙여넣으세요.
                    </p>
                    <div className="flex justify-center rounded-2xl bg-white p-4">
                      <img
                        src={qrDataUrl}
                        alt="Emergency VP QR"
                        className="h-56 w-56 rounded-xl bg-white"
                      />
                    </div>
                    <button
                      onClick={copy}
                      className="mt-3 w-full rounded-2xl bg-white/10 py-3 text-sm font-bold text-white ring-1 ring-white/20 active:bg-white/15"
                    >
                      {copied ? "복사됨" : "VP 페이로드 복사"}
                    </button>
                    {vpCompact && (
                      <details className="mt-3 text-xs text-white/60">
                        <summary className="cursor-pointer select-none font-semibold text-[var(--vital-2)]">
                          SD-JWT VP 페이로드 (시연용)
                        </summary>
                        <pre className="mt-1.5 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-white/[0.06] p-3 font-data text-[10px] text-white/80">
                          {vpCompact}
                        </pre>
                      </details>
                    )}
                  </div>
                )}

                {!qrDataUrl && qrError && vpCompact && (
                  <div className="flex flex-col gap-2">
                    <p className="rounded-2xl border-l-4 border-[var(--vital)] bg-white/[0.06] p-3 text-xs text-[var(--vital-2)]">
                      {qrError}
                    </p>
                    <button
                      onClick={copy}
                      className="w-full rounded-2xl bg-white/10 py-3 text-sm font-bold text-white ring-1 ring-white/20 active:bg-white/15"
                    >
                      {copied ? "복사됨" : "VP 페이로드 복사"}
                    </button>
                  </div>
                )}

                {!qrDataUrl && !qrError && (
                  <p className="text-xs text-white/60">QR 생성 중...</p>
                )}
              </div>
            )}
          </section>

          <BottomSheet
            open={confirmOpen}
            title="응급 정보를 공개할까요?"
            onClose={() => setConfirmOpen(false)}
          >
            <p className="text-sm leading-relaxed text-[var(--ink-2)]">
              의료진이 QR을 스캔하면 아래 정보만 볼 수 있어요.
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              <ShareRow label="혈액형" value={selected.blood} shared />
              <ShareRow
                label="알레르기"
                value={selected.allergen ? `${selected.allergen}${selected.severity ? ` · ${selected.severity}` : ""}` : "없음"}
                shared
              />
              {selected.meds && selected.meds.length > 0 && (
                <ShareRow label="복용약" value={selected.meds.join(", ")} shared />
              )}
              <ShareRow label="이름 · 주민번호 · 주소" value="공개 안 함" />
            </ul>
            <button
              type="button"
              onClick={() => {
                setConfirmOpen(false);
                setEmergencyOn(true);
              }}
              className="mt-5 w-full rounded-2xl bg-[var(--vital)] py-3.5 text-base font-bold text-white active:brightness-95"
            >
              공개하고 QR 만들기
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="mt-2 w-full rounded-2xl py-3 text-sm font-bold text-[var(--ink-2)] active:bg-[var(--paper)]"
            >
              취소
            </button>
          </BottomSheet>

          {/* ───────── 오늘 챙길 것 (개인화 액션 피드) ───────── */}
          <section className="mt-5">
            <p className="mb-2 px-1 font-data text-[10px] uppercase tracking-[0.2em] text-[var(--ink-2)]">
              오늘 챙길 것
            </p>
            <div className="flex flex-col gap-2">
              {unpaid.length === 0 && claimable.length === 0 && upcoming.length === 0 && (
                <div className="flex items-center gap-3 rounded-3xl bg-[var(--refund)]/10 px-5 py-4">
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[var(--refund)] font-data text-sm font-bold text-white">
                    ✓
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[var(--refund-ink)]">오늘은 급한 게 없어요</p>
                    <p className="mt-0.5 text-[11px] text-[var(--ink-2)]">
                      미납·청구·예약 모두 정리됐어요. 숨은 환급금만 한 번 확인해 보세요.
                    </p>
                  </div>
                </div>
              )}
              {unpaid.length > 0 && (
                <Link
                  to="/billing"
                  className="relative flex items-center justify-between overflow-hidden rounded-3xl bg-[var(--surface)] px-5 py-4 shadow-[0_1px_12px_rgba(11,59,60,0.07)] transition active:scale-[0.99]"
                >
                  <div className="absolute inset-y-0 left-0 w-1 bg-[var(--vital)]" />
                  <div className="pl-1">
                    <p className="text-sm font-bold text-[var(--ink)]">미납 진료비 {unpaid.length}건</p>
                    <p className="mt-0.5 text-[11px] text-[var(--ink-2)]">
                      {unpaid[0].hospital}
                      {unpaid.length > 1 ? ` 외 ${unpaid.length - 1}곳` : ""}
                    </p>
                  </div>
                  <p className="font-data text-lg font-bold text-[var(--vital-ink)]">
                    <CountUp value={unpaidTotal} suffix="원" />
                  </p>
                </Link>
              )}
              {claimable.length > 0 && (
                <Link
                  to="/insurance"
                  className="relative flex items-center justify-between overflow-hidden rounded-3xl bg-[var(--surface)] px-5 py-4 shadow-[0_1px_12px_rgba(11,59,60,0.07)] transition active:scale-[0.99]"
                >
                  <div className="absolute inset-y-0 left-0 w-1 bg-[var(--refund)]" />
                  <div className="pl-1">
                    <p className="text-sm font-bold text-[var(--ink)]">실손 청구 가능 {claimable.length}건</p>
                    <p className="mt-0.5 text-[11px] text-[var(--ink-2)]">낸 병원비, 보험으로 돌려받기</p>
                  </div>
                  <span className="font-data text-sm font-bold text-[var(--refund-ink)]">청구 →</span>
                </Link>
              )}
              {upcoming.length > 0 && (
                <Link
                  to="/billing"
                  className="relative flex items-center justify-between overflow-hidden rounded-3xl bg-[var(--surface)] px-5 py-4 shadow-[0_1px_12px_rgba(11,59,60,0.07)] transition active:scale-[0.99]"
                >
                  <div className="absolute inset-y-0 left-0 w-1 bg-[var(--ink)]" />
                  <div className="pl-1">
                    <p className="text-sm font-bold text-[var(--ink)]">다가오는 예약 {upcoming.length}건</p>
                    <p className="mt-0.5 text-[11px] text-[var(--ink-2)]">
                      {upcoming[0].hospital} · {upcoming[0].dept} · {upcoming[0].date}
                    </p>
                  </div>
                  <span className="font-data text-sm font-bold text-[var(--ink)]">보기 →</span>
                </Link>
              )}
              <Link
                to="/checker"
                className="relative flex items-center justify-between overflow-hidden rounded-3xl bg-[var(--surface)] px-5 py-4 shadow-[0_1px_12px_rgba(11,59,60,0.07)] transition active:scale-[0.99]"
              >
                <div className="absolute inset-y-0 left-0 w-1 bg-[var(--refund)]" />
                <div className="pl-1">
                  <p className="text-sm font-bold text-[var(--ink)]">숨은 의료비 환급 찾기</p>
                  <p className="mt-0.5 text-[11px] text-[var(--ink-2)]">전국 미신청 3,617억원 · 1분이면 확인</p>
                </div>
                <span className="font-data text-sm font-bold text-[var(--refund-ink)]">확인 →</span>
              </Link>
            </div>
          </section>

          {/* ───────── 빠른 작업: 환급 · 실손 · 예약 · 수납 ───────── */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              { to: "/checker", title: "환급", desc: "병원비 돌려받기", accent: "refund" },
              { to: "/insurance", title: "실손 청구", desc: "낸 병원비 보험 청구", accent: "refund", demo: true },
              { to: "/booking", title: "예약", desc: "진료 예약", accent: "ink", demo: true },
              { to: "/billing", title: "수납", desc: "진료비·진료기록", accent: "ink", demo: true },
            ].map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="relative overflow-hidden rounded-3xl bg-[var(--surface)] p-4 shadow-[0_1px_12px_rgba(11,59,60,0.07)]"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 ${a.accent === "refund" ? "bg-[var(--refund)]" : "bg-[var(--ink)]"}`}
                />
                <div className="text-sm font-bold text-[var(--ink)]">
                  {a.title}
                  {a.demo && (
                    <span className="ml-1 font-data text-[9px] font-medium text-[var(--ink-2)]">
                      시연
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[11px] leading-snug text-[var(--ink-2)]">{a.desc}</div>
              </Link>
            ))}
          </div>

          {/* ───────── 가족 프리미엄 ───────── */}
          <Link
            to="/subscribe"
            className="mt-4 flex items-center justify-between rounded-3xl bg-[var(--surface)] px-5 py-4 shadow-[0_1px_12px_rgba(11,59,60,0.07)]"
          >
            <div>
              <p className="text-sm font-bold text-[var(--ink)]">
                가족 프리미엄
                {isPremium() && (
                  <span className="ml-2 rounded-full bg-[var(--refund)]/12 px-2 py-0.5 font-data text-[10px] font-bold text-[var(--refund-ink)]">
                    이용 중
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--ink-2)]">
                {isPremium()
                  ? "가족 무제한 · 환급 자동 알림이 켜져 있어요"
                  : "가족 무제한 · 환급 자동 재확인 · 기록 백업 · 월 3,900원"}
              </p>
            </div>
            <span className="font-data text-sm font-bold text-[var(--refund-ink)]">
              {isPremium() ? "관리 →" : "구독 →"}
            </span>
          </Link>

          {/* ───────── 보조 ───────── */}
          <nav className="mt-6">
            <p className="mb-2 px-1 font-data text-[10px] uppercase tracking-[0.2em] text-[var(--ink-2)]">
              그 외
            </p>
            <div className="flex gap-2">
              {[
                { to: "/symptom", label: "증상 정보" },
                { to: "/diary", label: "증상 일기" },
                { to: "/labels", label: "라벨링 현황" },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex-1 rounded-2xl border border-[var(--mist)] bg-[var(--surface)] px-3 py-3 text-center text-[13px] font-semibold text-[var(--ink-2)] active:bg-[var(--paper)]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </main>
      </div>
    </div>
  );
}

/** 공개 확인 시트의 한 줄 — 공개되는 항목은 초록 체크, 아닌 항목은 회색 대시. */
function ShareRow({ label, value, shared }: { label: string; value: string; shared?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl bg-[var(--paper)] px-3 py-2.5">
      <span className="flex items-center gap-2 text-sm text-[var(--ink)]">
        <span
          aria-hidden="true"
          className={`flex h-5 w-5 items-center justify-center rounded-full font-data text-[11px] font-bold ${
            shared ? "bg-[var(--refund)] text-white" : "bg-[var(--mist)] text-[var(--ink-2)]"
          }`}
        >
          {shared ? "✓" : "–"}
        </span>
        {label}
      </span>
      <span
        className={`truncate font-data text-sm font-bold ${
          shared ? "text-[var(--ink)]" : "text-[var(--ink-2)]"
        }`}
      >
        {value}
      </span>
    </li>
  );
}

async function buildEmergencyQR(vcs: PatientVCs) {
  const { fullCompact, qrCompact } = await buildBundle(vcs);
  const qr = await QRCode.toDataURL(qrCompact, {
    errorCorrectionLevel: "L",
    margin: 1,
    width: 256,
  });
  return { qr, compact: fullCompact };
}
