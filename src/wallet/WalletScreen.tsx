import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "qrcode";
import { getPatientVCs, type PatientVCs } from "../data/patient-vcs";
import { DEMO_HOLDER } from "../data/issuer-keys";
import type { SignedVC } from "../lib/sdjwt";
import { buildBundle, buildVPPayload } from "./bundle";

/**
 * Wallet screen — patient PWA.
 *
 *   응급 모드 OFF                    응급 모드 ON
 *   ┌──────────┐                     ┌──────────┐
 *   │ VC card  │  toggle ───────►    │ VC card  │
 *   │ (passive)│                     │ + QR     │ ──► clipboard.writeText(VP)
 *   └──────────┘                     └──────────┘
 *
 * Disclosure 정책:
 *   mDL VC      → 0개 (전체 마스킹, issuer 서명만으로 신원 anchor)
 *   혈액형 VC   → bloodType, rhFactor
 *   알레르기 VC → allergens, severity
 */

// 비응급/응급 두 화면 모두에서 같은 카드 3장을 보여준다(응급 모드일 땐
// QR 아래로 순서만 바뀐다) — 데이터를 한 곳에 두고 두 번 렌더링한다.
const PATIENT_CARDS: VCCardProps[] = [
  {
    title: "모바일 운전면허증 (mDL)",
    issuerLabel: "Korean mDL Reference Issuer (Demo)",
    subtitle: "reference implementation, not gov-signed",
    claims: [
      ["이름", "김단유"],
      ["주민번호", "940123-1******"],
      ["생년월일", "1994-01-23"],
      ["면허 등급", "1종 보통"],
    ],
    accent: "blue",
  },
  {
    title: "혈액형 정보",
    issuerLabel: "Demo Hospital Issuer",
    claims: [
      ["혈액형", "A형"],
      ["Rh", "+"],
    ],
    accent: "rose",
  },
  {
    title: "알레르기 정보",
    issuerLabel: "Demo Hospital Issuer",
    claims: [
      ["알레르기", "페니실린"],
      ["중증도", "중증"],
      ["최종 갱신", "2026-03-10"],
    ],
    accent: "amber",
  },
];
export function WalletScreen() {
  useEffect(() => {
    document.title = "DID 응급 의료 신원 인증 데모";
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
      <div className="flex min-h-screen items-center justify-center bg-rose-50 p-6">
        <div className="rounded-2xl bg-white px-5 py-4 text-sm text-rose-700 shadow-sm">
          {seedError}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-100">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-slate-50 shadow-xl">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-blue-50 text-base">
            🪪
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-slate-900">환자 지갑</h1>
            <p className="truncate text-[11px] text-slate-400">
              holder: {DEMO_HOLDER.did.slice(0, 20)}…
            </p>
          </div>
          <Link
            to="/doctor"
            target="_blank"
            className="flex-none rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 active:bg-slate-200"
          >
            의사 화면 →
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-28 pt-5">
          <div className="mb-5 flex gap-2">
            <Link
              to="/symptom"
              className="flex-1 rounded-2xl bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 shadow-sm active:bg-slate-50"
            >
              증상 정보
            </Link>
            <Link
              to="/diary"
              className="flex-1 rounded-2xl bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 shadow-sm active:bg-slate-50"
            >
              증상 일기
            </Link>
          </div>

          {!emergencyOn && (
            <>
              <div className="mb-5 flex flex-col gap-3">
                {PATIENT_CARDS.map((card) => (
                  <VCCard key={card.title} {...card} />
                ))}
              </div>
              <p className="mb-4 px-1 text-xs leading-relaxed text-slate-400">
                응급 상황에서 아래 버튼을 누르면 혈액형 + 알레르기 정보만
                선택적으로 공개합니다. 이름·주민번호·주소는 공개되지 않습니다.
              </p>
            </>
          )}

          {/* 응급 모드에서는 의료진이 당장 봐야 할 QR이 화면 최상단에
              바로 보여야 한다 — 카드 3개를 스크롤해서 지나친 뒤에야 QR이
              나오면 정작 응급 상황에서 제일 늦게 보이는 역설이 생긴다. */}
          {emergencyOn && (
            <section className="overflow-hidden rounded-3xl bg-white p-5 shadow-sm">
              {qrDataUrl && (
                <div>
                  <p className="mb-3 text-xs text-slate-500">
                    의료진에게 QR을 보여주거나 아래 페이로드를 복사해서 의사
                    화면에 붙여넣으세요.
                  </p>
                  <div className="flex justify-center rounded-2xl bg-slate-50 p-4">
                    <img
                      src={qrDataUrl}
                      alt="Emergency VP QR"
                      className="h-56 w-56 rounded-xl bg-white"
                    />
                  </div>
                  <button
                    onClick={copy}
                    className="mt-3 w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white active:bg-slate-800"
                  >
                    {copied ? "복사됨" : "VP 페이로드 클립보드 복사"}
                  </button>
                  {vpCompact && (
                    <details className="mt-3 text-xs text-slate-400">
                      <summary className="cursor-pointer select-none text-blue-600">
                        SD-JWT VP 페이로드 (dev tools 시연용)
                      </summary>
                      <pre className="mt-1.5 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-slate-50 p-3 text-[10px]">
                        {vpCompact}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {!qrDataUrl && qrError && vpCompact && (
                <div className="flex flex-col gap-2">
                  <p className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-xs text-rose-700">
                    {qrError}
                  </p>
                  <button
                    onClick={copy}
                    className="w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white active:bg-slate-800"
                  >
                    {copied ? "복사됨" : "VP 페이로드 클립보드 복사"}
                  </button>
                  <details className="text-xs text-slate-400">
                    <summary className="cursor-pointer select-none text-blue-600">
                      SD-JWT VP 페이로드 ({new TextEncoder().encode(vpCompact).length} bytes)
                    </summary>
                    <pre className="mt-1.5 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-slate-50 p-3 text-[10px]">
                      {vpCompact}
                    </pre>
                  </details>
                </div>
              )}

              {!qrDataUrl && !qrError && (
                <p className="text-xs text-slate-400">QR 생성 중...</p>
              )}
            </section>
          )}

          {emergencyOn && (
            <div className="mt-5 flex flex-col gap-3">
              <p className="px-1 text-xs font-medium text-slate-400">
                보유 중인 정보 (QR에는 혈액형·알레르기만 포함)
              </p>
              {PATIENT_CARDS.map((card) => (
                <VCCard key={card.title} {...card} />
              ))}
            </div>
          )}
        </main>

        {/* 응급 모드 — 실제 응급 상황에서 바로 찾을 수 있게 하단 고정, 큰 터치 영역 */}
        <div className="pointer-events-none fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2">
          <div className="pointer-events-auto border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur">
            <button
              onClick={() => setEmergencyOn((v) => !v)}
              aria-pressed={emergencyOn}
              className={`w-full rounded-2xl py-3.5 text-base font-semibold text-white transition ${
                emergencyOn ? "bg-rose-600 active:bg-rose-700" : "bg-slate-900 active:bg-slate-800"
              }`}
            >
              {emergencyOn ? "응급 모드 끄기" : "응급 모드 켜기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface VCCardProps {
  title: string;
  issuerLabel: string;
  subtitle?: string;
  claims: [string, string][];
  accent: "blue" | "rose" | "amber";
}

function VCCard({ title, issuerLabel, subtitle, claims, accent }: VCCardProps) {
  const dot = {
    blue: "bg-blue-500",
    rose: "bg-rose-500",
    amber: "bg-amber-500",
  }[accent];

  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-2 w-2 flex-none rounded-full ${dot}`} />
          <h3 className="truncate text-sm font-semibold text-slate-800">{title}</h3>
        </div>
        <span className="max-w-[55%] flex-none truncate rounded-full bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500">
          {issuerLabel}
        </span>
      </div>
      {subtitle && <p className="mt-0.5 text-[10px] italic text-slate-400">{subtitle}</p>}
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-700">
        {claims.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-slate-400">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
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
