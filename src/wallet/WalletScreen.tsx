import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "qrcode";
import { getPatientVCs, type PatientVCs } from "../data/patient-vcs";
import { buildBundle, buildVPPayload } from "./bundle";
import { listMembers, getMember, SELF_ID, type FamilyMember } from "../family/store";

/**
 * 가족 환자 의료지갑 — 보호자(자녀)가 가족 구성원의 의료를 한 곳에서 관리.
 *
 *   [ 본인 · 엄마 · 아빠 · + ]        ← 가족 전환
 *   ┌ 응급 의료 신원증 (선택 구성원) ┐  신원 = vital(코랄)
 *   │ 혈액형 · 알레르기 · 복용약       │  본인만 실제 QR 공개(SD-JWT VP)
 *   └ [ 응급 공개 · QR ] ─────────────┘
 *   [ 환급 ] [ 예약·시연 ] [ 수납·시연 ]  빠른 작업
 *
 * 예약·수납은 병원 연동이 없으므로 '시연'으로 명확히 표시한다(가짜로 되는 척 안 함).
 */
export function WalletScreen() {
  useEffect(() => {
    document.title = "가족 의료지갑 — 신원 · 환급 · 예약";
  }, []);

  const members = listMembers();
  const [selectedId, setSelectedId] = useState<string>(SELF_ID);
  const selected: FamilyMember = getMember(selectedId) ?? members[0];
  const isSelf = selected.id === SELF_ID;

  const [vcs, setVCs] = useState<PatientVCs | null>(null);
  const [emergencyOn, setEmergencyOn] = useState(false);
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

  // 실제 VP/QR은 본인(실제 VC 보유)만 생성한다.
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
    setEmergencyOn(false); // 구성원을 바꾸면 응급 공개는 초기화
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
                  className={`flex-none rounded-full px-4 py-2 text-sm font-bold transition ${
                    active
                      ? "bg-[var(--ink)] text-white"
                      : "border border-[var(--mist)] bg-[var(--surface)] text-[var(--ink-2)]"
                  }`}
                >
                  {m.name}
                  <span className="ml-1.5 text-[11px] font-medium opacity-70">
                    {m.relation}
                  </span>
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

          {/* ───────── 응급 의료 신원증 (선택 구성원) ───────── */}
          <section className="relative overflow-hidden rounded-[28px] bg-[var(--surface)] shadow-[0_2px_24px_rgba(11,59,60,0.09)]">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-[var(--vital)]" />
            <div className="px-5 py-5 pl-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="vital-dot h-2 w-2 rounded-full bg-[var(--vital)]" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--vital-ink)]">
                    응급 의료 신원증
                  </span>
                </div>
                <span className="font-data text-[10px] text-[var(--ink-2)]">
                  {isSelf ? "SD-JWT ✓" : "시연 프로필"}
                </span>
              </div>

              <h2 className="mt-3 text-[26px] font-extrabold leading-none tracking-tight text-[var(--ink)]">
                {selected.name}
                <span className="ml-2 align-middle text-sm font-bold text-[var(--ink-2)]">
                  {selected.relation}
                </span>
              </h2>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[var(--paper)] px-3.5 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-2)]">
                    혈액형
                  </div>
                  <div className="font-data text-2xl font-bold leading-tight text-[var(--ink)]">
                    {selected.blood}
                    <span className="text-[var(--vital)]">{selected.rh}</span>
                  </div>
                </div>
                <div className="rounded-2xl bg-[var(--paper)] px-3.5 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-2)]">
                    알레르기
                  </div>
                  <div className="font-data text-base font-bold leading-tight text-[var(--vital-ink)]">
                    {selected.allergen ?? "없음"}
                  </div>
                  {selected.severity && (
                    <div className="font-data text-[11px] text-[var(--vital-ink)]/80">
                      {selected.severity}
                    </div>
                  )}
                </div>
              </div>

              {selected.meds && selected.meds.length > 0 && (
                <div className="mt-3">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-2)]">
                    복용 중인 약
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.meds.map((m) => (
                      <span
                        key={m}
                        className="rounded-full bg-[var(--paper)] px-2.5 py-1 font-data text-[11px] font-medium text-[var(--ink)]"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {isSelf ? (
                <>
                  <button
                    onClick={() => setEmergencyOn((v) => !v)}
                    aria-pressed={emergencyOn}
                    className={`mt-4 w-full rounded-2xl py-3.5 text-base font-bold tracking-tight text-white transition ${
                      emergencyOn
                        ? "bg-[var(--ink)] active:brightness-110"
                        : "bg-[var(--vital)] active:brightness-95"
                    }`}
                  >
                    {emergencyOn ? "공개 중단" : "응급 공개 · QR 생성"}
                  </button>
                  <p className="mt-2 text-center text-[11px] leading-relaxed text-[var(--ink-2)]">
                    혈액형 + 알레르기만 공개합니다. 이름·주민번호·주소는 공개되지 않아요.
                  </p>
                </>
              ) : (
                <p className="mt-4 rounded-2xl bg-[var(--paper)] px-4 py-3 text-center text-xs leading-relaxed text-[var(--ink-2)]">
                  가족 데모 프로필입니다. 실제 응급 QR(SD-JWT 서명)은 본인 프로필에서만
                  생성됩니다. 가족 구성원의 실제 발급은 추후 병원·기관 연동으로 열립니다.
                </p>
              )}
            </div>

            {isSelf && emergencyOn && (
              <div className="animate-reveal-in border-t border-[var(--mist)] px-5 py-5 pl-6">
                {qrDataUrl && (
                  <div>
                    <p className="mb-3 text-xs text-[var(--ink-2)]">
                      의료진에게 QR을 보여주거나 아래 페이로드를 복사해 의사 화면에
                      붙여넣으세요.
                    </p>
                    <div className="flex justify-center rounded-2xl bg-[var(--paper)] p-4">
                      <img
                        src={qrDataUrl}
                        alt="Emergency VP QR"
                        className="h-56 w-56 rounded-xl bg-white"
                      />
                    </div>
                    <button
                      onClick={copy}
                      className="mt-3 w-full rounded-2xl bg-[var(--ink)] py-3 text-sm font-bold text-white active:brightness-110"
                    >
                      {copied ? "복사됨" : "VP 페이로드 복사"}
                    </button>
                    {vpCompact && (
                      <details className="mt-3 text-xs text-[var(--ink-2)]">
                        <summary className="cursor-pointer select-none font-semibold text-[var(--refund-ink)]">
                          SD-JWT VP 페이로드 (시연용)
                        </summary>
                        <pre className="mt-1.5 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-[var(--paper)] p-3 font-data text-[10px]">
                          {vpCompact}
                        </pre>
                      </details>
                    )}
                  </div>
                )}

                {!qrDataUrl && qrError && vpCompact && (
                  <div className="flex flex-col gap-2">
                    <p className="rounded-2xl border-l-4 border-[var(--vital)] bg-[var(--paper)] p-3 text-xs text-[var(--vital-ink)]">
                      {qrError}
                    </p>
                    <button
                      onClick={copy}
                      className="w-full rounded-2xl bg-[var(--ink)] py-3 text-sm font-bold text-white active:brightness-110"
                    >
                      {copied ? "복사됨" : "VP 페이로드 복사"}
                    </button>
                  </div>
                )}

                {!qrDataUrl && !qrError && (
                  <p className="text-xs text-[var(--ink-2)]">QR 생성 중...</p>
                )}
              </div>
            )}
          </section>

          {/* ───────── 빠른 작업: 환급 · 예약 · 수납 ───────── */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Link
              to="/checker"
              className="relative overflow-hidden rounded-3xl bg-[var(--surface)] p-4 shadow-[0_1px_12px_rgba(11,59,60,0.07)]"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-[var(--refund)]" />
              <div className="text-sm font-bold text-[var(--ink)]">환급</div>
              <div className="mt-0.5 text-[11px] leading-snug text-[var(--ink-2)]">
                병원비 돌려받기
              </div>
            </Link>
            <Link
              to="/booking"
              className="relative overflow-hidden rounded-3xl bg-[var(--surface)] p-4 shadow-[0_1px_12px_rgba(11,59,60,0.07)]"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-[var(--ink)]" />
              <div className="text-sm font-bold text-[var(--ink)]">
                예약
                <span className="ml-1 font-data text-[9px] font-medium text-[var(--ink-2)]">
                  시연
                </span>
              </div>
              <div className="mt-0.5 text-[11px] leading-snug text-[var(--ink-2)]">
                진료 예약
              </div>
            </Link>
            <Link
              to="/billing"
              className="relative overflow-hidden rounded-3xl bg-[var(--surface)] p-4 shadow-[0_1px_12px_rgba(11,59,60,0.07)]"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-[var(--ink)]" />
              <div className="text-sm font-bold text-[var(--ink)]">
                수납
                <span className="ml-1 font-data text-[9px] font-medium text-[var(--ink-2)]">
                  시연
                </span>
              </div>
              <div className="mt-0.5 text-[11px] leading-snug text-[var(--ink-2)]">
                진료비 납부
              </div>
            </Link>
          </div>

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

async function buildEmergencyQR(vcs: PatientVCs) {
  const { fullCompact, qrCompact } = await buildBundle(vcs);
  const qr = await QRCode.toDataURL(qrCompact, {
    errorCorrectionLevel: "L",
    margin: 1,
    width: 256,
  });
  return { qr, compact: fullCompact };
}
