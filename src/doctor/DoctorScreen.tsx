import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { TRUST_ANCHORS, DEMO_AUDIENCE, MDL_ISSUER } from "../data/issuer-keys";
import { verifyVP, VerifyError, type VerifyResult } from "../lib/sdjwt";
import { DDICheck } from "./DDICheck";

interface PresentationBundle {
  blood: string;
  allergy: string;
  mDL: string;
  nonce: string;
}

interface VerifiedBundle {
  blood: VerifyResult;
  allergy: VerifyResult;
  mDL: VerifyResult;
  mDLTrusted: boolean;
}

export function DoctorScreen() {
  const [pasteValue, setPasteValue] = useState("");
  const [bundle, setBundle] = useState<VerifiedBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanActive, setScanActive] = useState(false);

  useEffect(() => {
    return () => {
      void scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  const verifyText = (text: string) => {
    setError(null);
    try {
      const parsed = JSON.parse(text) as PresentationBundle;
      const blood = verifyVP({
        vp: parsed.blood,
        trustAnchors: TRUST_ANCHORS,
        expectedAudience: DEMO_AUDIENCE,
        expectedNonce: parsed.nonce,
      });
      const allergy = verifyVP({
        vp: parsed.allergy,
        trustAnchors: TRUST_ANCHORS,
        expectedAudience: DEMO_AUDIENCE,
        expectedNonce: parsed.nonce,
      });
      const mDL = verifyVP({
        vp: parsed.mDL,
        trustAnchors: TRUST_ANCHORS,
        expectedAudience: DEMO_AUDIENCE,
        expectedNonce: parsed.nonce,
      });
      setBundle({
        blood,
        allergy,
        mDL,
        mDLTrusted: mDL.issuer === MDL_ISSUER.did,
      });
    } catch (e) {
      if (e instanceof VerifyError) {
        setError(`❌ VC 검증 실패: ${e.reason}`);
      } else {
        setError(`❌ 검증 오류: ${(e as Error).message}`);
      }
      setBundle(null);
    }
  };

  const startScan = async () => {
    setError(null);
    setScanActive(true);
    const id = "qr-reader";
    scannerRef.current = new Html5Qrcode(id);
    try {
      await scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          verifyText(decoded);
          void scannerRef.current?.stop().then(() => setScanActive(false));
        },
        () => {},
      );
    } catch (e) {
      setError(`카메라 시작 실패: ${(e as Error).message}. 페이스트를 사용하세요.`);
      setScanActive(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">의사 화면</h1>
          <p className="text-xs text-slate-500">
            응급실 / Demo General Hospital
          </p>
        </div>
        <Link
          to="/wallet"
          className="text-sm text-blue-600 underline"
          target="_blank"
        >
          ← 환자 wallet
        </Link>
      </header>

      {!bundle && (
        <section className="mb-6 bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h2 className="font-semibold text-slate-700 mb-2">
            환자 VP 입력
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            환자 wallet의 QR을 스캔하거나, 클립보드에서 ⌘V로 페이로드를 붙여넣으세요.
          </p>

          <div className="flex gap-2 mb-3">
            <button
              onClick={startScan}
              disabled={scanActive}
              className="bg-slate-800 text-white px-4 py-2 rounded text-sm disabled:opacity-40"
            >
              {scanActive ? "스캔 중..." : "QR 스캔 시작"}
            </button>
            <button
              onClick={() => verifyText(pasteValue)}
              disabled={!pasteValue}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-40"
            >
              페이스트 검증
            </button>
          </div>

          <div id="qr-reader" className="mb-3 max-w-sm" />

          <textarea
            value={pasteValue}
            onChange={(e) => setPasteValue(e.target.value)}
            placeholder='wallet에서 복사한 JSON ({"blood":"...","allergy":"...","mDL":"...","nonce":"..."})'
            className="w-full h-24 border border-slate-300 rounded p-2 text-xs font-mono"
          />
        </section>
      )}

      {error && (
        <div className="mb-4 bg-rose-50 border border-rose-300 text-rose-800 p-3 rounded">
          {error}
          <button
            onClick={() => {
              setError(null);
              setPasteValue("");
            }}
            className="ml-3 underline text-xs"
          >
            다시
          </button>
        </div>
      )}

      {bundle && (
        <section className="space-y-4">
          {bundle.mDLTrusted && (
            <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-3 flex items-center gap-3">
              <span className="text-2xl">✓</span>
              <div>
                <div className="font-semibold text-blue-900">
                  Korean mDL Reference Issuer 서명 검증됨
                </div>
                <div className="text-xs text-blue-700">
                  환자 신원이 한국 mDL 표준 reference issuer로 anchor됨
                  (demo). 식별 정보는 환자 동의 하에 마스킹.
                </div>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <PatientPanel bundle={bundle} />
            <DDICheck
              allergens={
                (bundle.allergy.revealedClaims.allergens as string[]) ?? []
              }
              severity={bundle.allergy.revealedClaims.severity as
                | string
                | undefined}
            />
          </div>

          <details className="bg-slate-50 border border-slate-200 rounded p-3">
            <summary className="text-sm font-medium text-slate-700 cursor-pointer">
              검증 메타데이터 (dev tools 시연용)
            </summary>
            <pre className="text-[10px] mt-2 whitespace-pre-wrap break-all">
              {JSON.stringify(
                {
                  blood: {
                    issuer: bundle.blood.issuer,
                    vct: bundle.blood.vct,
                    revealed: bundle.blood.revealedClaims,
                    hiddenCount: bundle.blood.hiddenClaimNames.length,
                    aud: bundle.blood.kbAudience,
                    nonce: bundle.blood.kbNonce,
                  },
                  allergy: {
                    issuer: bundle.allergy.issuer,
                    revealed: bundle.allergy.revealedClaims,
                    hiddenCount: bundle.allergy.hiddenClaimNames.length,
                  },
                  mDL: {
                    issuer: bundle.mDL.issuer,
                    vct: bundle.mDL.vct,
                    revealed: bundle.mDL.revealedClaims,
                    hiddenCount: bundle.mDL.hiddenClaimNames.length,
                  },
                },
                null,
                2,
              )}
            </pre>
          </details>

          <button
            onClick={() => {
              setBundle(null);
              setPasteValue("");
            }}
            className="text-sm text-slate-600 underline"
          >
            다시 입력
          </button>
        </section>
      )}
    </div>
  );
}

function PatientPanel({ bundle }: { bundle: VerifiedBundle }) {
  const blood = bundle.blood.revealedClaims.bloodType as string | undefined;
  const rh = bundle.blood.revealedClaims.rhFactor as string | undefined;
  const allergens = bundle.allergy.revealedClaims.allergens as
    | string[]
    | undefined;
  const severity = bundle.allergy.revealedClaims.severity as
    | string
    | undefined;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <h2 className="font-semibold text-slate-800 mb-3">환자 정보 (마스킹됨)</h2>

      <dl className="space-y-2 text-sm">
        <Row label="이름" value={<Masked />} />
        <Row label="주민번호" value={<Masked />} />
        <Row label="주소" value={<Masked />} />
        <Row label="혈액형" value={<strong>{blood ?? "?"} {rh ?? ""}</strong>} />
        <Row
          label="알레르기"
          value={
            allergens && allergens.length > 0 ? (
              <strong className="text-rose-700">
                {allergens.join(", ")}
                {severity && (
                  <span className="ml-2 text-xs">({severity})</span>
                )}
              </strong>
            ) : (
              <span className="text-slate-500">정보 없음</span>
            )
          }
        />
      </dl>
      <p className="mt-3 text-[10px] text-slate-500">
        ●●● = SD-JWT undisclosed digest (실제 데이터는 wallet에 보관됨, presentation에 포함되지 않음)
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="w-20 text-slate-500 text-xs">{label}</dt>
      <dd className="text-slate-800">{value}</dd>
    </div>
  );
}

function Masked() {
  return <span className="font-mono text-slate-400">●●●</span>;
}
