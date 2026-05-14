import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "qrcode";
import { getPatientVCs } from "../data/patient-vcs";
import { DEMO_AUDIENCE, DEMO_HOLDER } from "../data/issuer-keys";
import { presentVP, randomNonce, type SignedVC } from "../lib/sdjwt";

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
export function WalletScreen() {
  const [vcs, setVCs] = useState<ReturnType<typeof getPatientVCs> | null>(null);
  const [emergencyOn, setEmergencyOn] = useState(false);
  const [qrDataUrl, setQRDataUrl] = useState<string | null>(null);
  const [vpCompact, setVpCompact] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const result = getPatientVCs();
      setVCs(result);
    } catch (e) {
      setError(`VC seed 실패: ${(e as Error).message}`);
    }
  }, []);

  useEffect(() => {
    if (!emergencyOn || !vcs) {
      setQRDataUrl(null);
      setVpCompact(null);
      return;
    }
    void buildEmergencyQR(vcs).then(({ qr, compact }) => {
      setQRDataUrl(qr);
      setVpCompact(compact);
      // Copy to clipboard so doctor tab can paste — bypass camera scan issues.
      navigator.clipboard?.writeText(compact).catch(() => {
        /* ignore (insecure context) */
      });
    });
  }, [emergencyOn, vcs]);

  const copy = () => {
    if (!vpCompact) return;
    navigator.clipboard.writeText(vpCompact).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50 p-6">
        <div className="text-rose-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 max-w-md mx-auto">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-slate-800">환자 지갑 (Wallet)</h1>
        <p className="text-xs text-slate-500">
          holder: {DEMO_HOLDER.did.slice(0, 24)}…
        </p>
        <Link
          to="/doctor"
          className="text-xs text-blue-600 underline"
          target="_blank"
        >
          → 의사 화면 새 탭에서 열기
        </Link>
      </header>

      <div className="space-y-3 mb-6">
        <VCCard
          title="모바일 운전면허증 (mDL)"
          issuerLabel="🇰🇷 Korean mDL Reference Issuer (Demo)"
          subtitle="reference implementation, not gov-signed"
          claims={[
            ["이름", "김단유"],
            ["주민번호", "940123-1******"],
            ["생년월일", "1994-01-23"],
            ["면허 등급", "1종 보통"],
          ]}
          accent="blue"
        />
        <VCCard
          title="혈액형 정보"
          issuerLabel="Demo Hospital Issuer"
          claims={[
            ["혈액형", "A형"],
            ["Rh", "+"],
          ]}
          accent="rose"
        />
        <VCCard
          title="알레르기 정보"
          issuerLabel="Demo Hospital Issuer"
          claims={[
            ["알레르기", "페니실린"],
            ["중증도", "중증"],
            ["최종 갱신", "2026-03-10"],
          ]}
          accent="amber"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <label className="flex items-center justify-between mb-3">
          <span className="font-semibold text-slate-700">응급 모드</span>
          <button
            onClick={() => setEmergencyOn((v) => !v)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium ${
              emergencyOn
                ? "bg-rose-600 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            {emergencyOn ? "ON (응급 활성화)" : "OFF"}
          </button>
        </label>

        {emergencyOn && qrDataUrl && (
          <div className="mt-2">
            <p className="text-xs text-slate-500 mb-2">
              의료진에게 QR을 보여주거나 아래 페이로드를 복사해서 의사 화면에
              붙여넣으세요.
            </p>
            <img
              src={qrDataUrl}
              alt="Emergency VP QR"
              className="mx-auto w-56 h-56 border"
            />
            <button
              onClick={copy}
              className="mt-3 w-full bg-slate-800 text-white py-2 rounded text-sm font-medium"
            >
              {copied ? "✓ 복사됨" : "VP 페이로드 클립보드 복사"}
            </button>
            {vpCompact && (
              <details className="mt-2">
                <summary className="text-xs text-slate-500 cursor-pointer">
                  SD-JWT VP 페이로드 (dev tools 시연용)
                </summary>
                <pre className="text-[10px] break-all whitespace-pre-wrap bg-slate-50 p-2 mt-1 max-h-32 overflow-auto">
                  {vpCompact}
                </pre>
              </details>
            )}
          </div>
        )}

        {emergencyOn && !qrDataUrl && (
          <p className="text-xs text-slate-500">QR 생성 중...</p>
        )}

        {!emergencyOn && (
          <p className="text-xs text-slate-500">
            응급 상황에서 토글을 켜면 혈액형 + 알레르기 정보만 선택적으로
            공개합니다. 이름·주민번호·주소는 공개되지 않습니다.
          </p>
        )}
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
  const palette = {
    blue: "bg-blue-50 border-blue-200",
    rose: "bg-rose-50 border-rose-200",
    amber: "bg-amber-50 border-amber-200",
  }[accent];

  return (
    <div className={`border rounded-lg p-3 ${palette}`}>
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
          {issuerLabel}
        </span>
      </div>
      {subtitle && (
        <p className="text-[10px] text-slate-500 italic mb-1">{subtitle}</p>
      )}
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-700">
        {claims.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-slate-500">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

async function buildEmergencyQR(vcs: ReturnType<typeof getPatientVCs>) {
  const nonce = randomNonce();
  const bloodVP = presentVP({
    vc: vcs.bloodType,
    revealClaimNames: ["bloodType", "rhFactor"],
    holderPrivateKey: DEMO_HOLDER.privateKey,
    holderDid: DEMO_HOLDER.did,
    audience: DEMO_AUDIENCE,
    nonce,
  });
  const allergyVP = presentVP({
    vc: vcs.allergy,
    revealClaimNames: ["allergens", "severity"],
    holderPrivateKey: DEMO_HOLDER.privateKey,
    holderDid: DEMO_HOLDER.did,
    audience: DEMO_AUDIENCE,
    nonce,
  });
  const mDLVP = presentVP({
    vc: vcs.mDL,
    revealClaimNames: [], // 전체 마스킹
    holderPrivateKey: DEMO_HOLDER.privateKey,
    holderDid: DEMO_HOLDER.did,
    audience: DEMO_AUDIENCE,
    nonce,
  });

  const compact = JSON.stringify({
    blood: bloodVP.compact,
    allergy: allergyVP.compact,
    mDL: mDLVP.compact,
    nonce,
  });
  const qr = await QRCode.toDataURL(compact, {
    errorCorrectionLevel: "L",
    margin: 1,
    width: 256,
  });
  return { qr, compact };
}
