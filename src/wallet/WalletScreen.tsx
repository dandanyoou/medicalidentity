import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "qrcode";
import { getPatientVCs, type PatientVCs } from "../data/patient-vcs";
import { DEMO_HOLDER } from "../data/issuer-keys";
import { buildBundle, buildVPPayload } from "./bundle";

/**
 * 환자 의료지갑 — 두 간판(응급 의료신원 + 의료비 환급)을 히어로로 세운 홈.
 *
 *   PILLAR 1 응급 의료 신원증 (시그니처)   PILLAR 2 의료비 환급
 *   ┌ vital edge ───────────────┐          ┌ refund edge ─────────┐
 *   │ 혈액형 A+ · 알레르기        │          │ 낸 병원비 돌려받기     │
 *   │ [ 응급 공개 · QR 생성 ] ───►│ QR+VP    │ [ 내 환급액 확인 → ]   │
 *   └────────────────────────────┘          └──────────────────────┘
 *
 * 응급 공개 시 혈액형 + 알레르기만 선택 공개(SD-JWT VP) — 이름·주민번호는 비공개.
 */

// 응급 상황에서 의료진이 즉시 봐야 하는 핵심 정보(히어로 카드에 노출).
const EMERGENCY = {
  name: "김단유",
  blood: "A",
  rh: "+",
  allergen: "페니실린",
  severity: "중증",
};

// 지갑이 보유한 전체 자격증명(응급 공개 시 "보유 정보"로 펼침).
const PATIENT_CARDS: VCCardProps[] = [
  {
    title: "모바일 운전면허증 (mDL)",
    issuerLabel: "Korean mDL Reference Issuer (Demo)",
    subtitle: "reference implementation, not gov-signed",
    accent: "ink",
    claims: [
      ["이름", "김단유"],
      ["주민번호", "940123-1******"],
      ["생년월일", "1994-01-23"],
      ["면허 등급", "1종 보통"],
    ],
  },
  {
    title: "혈액형 정보",
    issuerLabel: "Demo Hospital Issuer",
    accent: "vital",
    claims: [
      ["혈액형", "A형"],
      ["Rh", "+"],
    ],
  },
  {
    title: "알레르기 정보",
    issuerLabel: "Demo Hospital Issuer",
    accent: "vital",
    claims: [
      ["알레르기", "페니실린"],
      ["중증도", "중증"],
      ["최종 갱신", "2026-03-10"],
    ],
  },
];

export function WalletScreen() {
  useEffect(() => {
    document.title = "환자 의료지갑 — 신원 · 환급";
  }, []);

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

  useEffect(() => {
    if (!emergencyOn || !vcs) {
      setQRDataUrl(null);
      setVpCompact(null);
      setQrError(null);
      return;
    }
    // 토글을 빠르게 켬/끔/켬 하면 이전 비동기 VP 생성이 나중에 끝나면서
    // 최신 상태를 덮어쓸 수 있다 — 이 effect 실행이 더 이상 "최신"이
    // 아니게 되면 결과를 반영하지 않는다.
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
        // QR overflow is recoverable — keep paste path alive.
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
  }, [emergencyOn, vcs]);

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
              의료 신원 · 환급
            </p>
            <h1 className="text-lg font-extrabold tracking-tight text-[var(--ink)]">
              환자 의료지갑
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

        <main className="flex-1 overflow-y-auto px-5 pb-10 pt-5">
          {/* ───────── PILLAR 1 · 응급 의료 신원증 (시그니처) ───────── */}
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
                <span className="font-data text-[10px] text-[var(--ink-2)]">SD-JWT ✓</span>
              </div>

              <h2 className="mt-3 text-[26px] font-extrabold leading-none tracking-tight text-[var(--ink)]">
                {EMERGENCY.name}
              </h2>
              <p className="mt-1 font-data text-[11px] text-[var(--ink-2)]">
                holder {DEMO_HOLDER.did.slice(0, 18)}…
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[var(--paper)] px-3.5 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-2)]">
                    혈액형
                  </div>
                  <div className="font-data text-2xl font-bold leading-tight text-[var(--ink)]">
                    {EMERGENCY.blood}
                    <span className="text-[var(--vital)]">{EMERGENCY.rh}</span>
                  </div>
                </div>
                <div className="rounded-2xl bg-[var(--paper)] px-3.5 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-2)]">
                    알레르기
                  </div>
                  <div className="font-data text-base font-bold leading-tight text-[var(--vital-ink)]">
                    {EMERGENCY.allergen}
                  </div>
                  <div className="font-data text-[11px] text-[var(--vital-ink)]/80">
                    {EMERGENCY.severity}
                  </div>
                </div>
              </div>

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
            </div>

            {/* 응급 공개 중 — 의료진이 바로 볼 QR을 카드 하단에 펼친다. */}
            {emergencyOn && (
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
                    <details className="text-xs text-[var(--ink-2)]">
                      <summary className="cursor-pointer select-none font-semibold text-[var(--refund-ink)]">
                        SD-JWT VP 페이로드 ({new TextEncoder().encode(vpCompact).length} bytes)
                      </summary>
                      <pre className="mt-1.5 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-[var(--paper)] p-3 font-data text-[10px]">
                        {vpCompact}
                      </pre>
                    </details>
                  </div>
                )}

                {!qrDataUrl && !qrError && (
                  <p className="text-xs text-[var(--ink-2)]">QR 생성 중...</p>
                )}
              </div>
            )}
          </section>

          {/* ───────── PILLAR 2 · 의료비 환급 ───────── */}
          <Link
            to="/checker"
            className="group relative mt-4 block overflow-hidden rounded-[28px] bg-[var(--surface)] shadow-[0_2px_24px_rgba(11,59,60,0.09)]"
          >
            <div className="absolute inset-y-0 left-0 w-1.5 bg-[var(--refund)]" />
            <div className="px-5 py-5 pl-6">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--refund-ink)]">
                숨은 의료비 환급
              </span>
              <p className="mt-2 text-xl font-extrabold leading-snug tracking-tight text-[var(--ink)]">
                낸 병원비, 돌려받을 수 있어요
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-2)]">
                본인부담상한제 초과분을 1분 안에 확인. 소득분위와 금액만 입력하면
                돼요.
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 font-data text-sm font-bold text-[var(--refund-ink)]">
                내 환급액 확인
                <span className="transition-transform group-active:translate-x-0.5">→</span>
              </span>
            </div>
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

          {/* 응급 공개 중에만 전체 보유 정보를 펼친다(평소엔 숨겨 홈을 깔끔하게). */}
          {emergencyOn && (
            <div className="mt-6">
              <p className="mb-2 px-1 font-data text-[10px] uppercase tracking-[0.2em] text-[var(--ink-2)]">
                보유 정보 · QR엔 혈액형·알레르기만 포함
              </p>
              <div className="flex flex-col gap-3 md:grid md:grid-cols-2">
                {PATIENT_CARDS.map((card) => (
                  <VCCard key={card.title} {...card} />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

interface VCCardProps {
  title: string;
  issuerLabel: string;
  subtitle?: string;
  claims: [string, string][];
  accent: "ink" | "vital" | "refund";
}

function VCCard({ title, issuerLabel, subtitle, claims, accent }: VCCardProps) {
  const edge = {
    ink: "bg-[var(--ink)]",
    vital: "bg-[var(--vital)]",
    refund: "bg-[var(--refund)]",
  }[accent];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[var(--surface)] shadow-[0_1px_12px_rgba(11,59,60,0.07)]">
      <div className={`absolute inset-y-0 left-0 w-1 ${edge}`} />
      <div className="p-4 pl-5">
        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
          <h3 className="truncate text-sm font-bold text-[var(--ink)]">{title}</h3>
          <span className="max-w-[55%] flex-none truncate rounded-full bg-[var(--paper)] px-2 py-0.5 font-data text-[10px] text-[var(--ink-2)]">
            {issuerLabel}
          </span>
        </div>
        {subtitle && (
          <p className="mt-0.5 text-[10px] italic text-[var(--ink-2)]">{subtitle}</p>
        )}
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-[var(--ink)]">
          {claims.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-[var(--ink-2)]">{k}</dt>
              <dd className="font-data font-medium">{v}</dd>
            </div>
          ))}
        </dl>
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
