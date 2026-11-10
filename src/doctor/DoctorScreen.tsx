import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import {
  TRUST_ANCHORS,
  DEMO_AUDIENCE,
  MDL_ISSUER,
  REVOKED_CREDENTIAL_IDS,
} from "../data/issuer-keys";
import { verifyVP, VerifyError, type VerifyResult } from "../lib/sdjwt";
import { getPatientVCs } from "../data/patient-vcs";
import { buildVPPayload } from "../wallet/bundle";
import { DDICheck } from "./DDICheck";
import { ControlledSubstancePanel } from "./ControlledSubstancePanel";
import { Skeleton } from "../shell/Skeleton";
import { QueuePanel } from "./QueuePanel";
import { ROLE_LABEL, currentSession, logout as badgeLogout, type Session } from "../hospital/badge";
import { IssuePanel } from "../documents/IssuePanel";

// 검증 중에 "무엇을 확인하는지" 보여주는 체크 목록 — 스피너보다 신뢰가 간다.
const VERIFY_CHECKS = ["발급자 서명", "신뢰 앵커(mDL)", "폐기·만료 여부"];

interface PresentationBundle {
  blood: string;
  allergy: string;
  mDL?: string; // optional — dropped from QR path to fit ~2,953-byte limit
  controlledSubstance?: string; // optional — same reason as mDL, paste-only
  nonce: string;
}

interface VerifiedBundle {
  blood: VerifyResult;
  allergy: VerifyResult;
  mDL: VerifyResult | null;
  mDLTrusted: boolean;
  controlledSubstance: VerifyResult | null;
}

type DoctorMode = "emergency" | "controlled";

export function DoctorScreen() {
  useEffect(() => {
    document.title = "DID 응급 의료 신원 인증 데모 — 의사용";
  }, []);

  const [pasteValue, setPasteValue] = useState("");
  const [bundle, setBundle] = useState<VerifiedBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanActive, setScanActive] = useState(false);
  // D6 REGRESSION: 기본값은 항상 "emergency" — 관리약물 모드는 명시적으로 켜야 함.
  const [mode, setMode] = useState<DoctorMode>("emergency");
  // R2: 직원 배지 로그인(시연) 뒤에만 대기열·VP 검증이 열린다.
  const [session, setSession] = useState<Session | null>(() => currentSession());
  // R3: 진료 흐름(대기열·문진 카드·진료 완료)과 응급 신원 확인(VP 검증)은 다른 일이라 탭으로 나눈다.
  const [tab, setTab] = useState<"queue" | "emergency">("queue");
  // 대기열에서 진료를 마치면 서류 발급 패널이 다시 읽도록 하는 버전 번호.
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    return () => {
      void scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  const verifyText = async (text: string) => {
    setError(null);
    setVerifying(true);
    try {
      const parsed = JSON.parse(text) as PresentationBundle;
      // ER에서 급하게 붙여넣다 보면 복사가 중간에 잘리거나 필수 필드가
      // 빠지기 쉽다 — 그 경우 검증 라이브러리의 저수준 에러 대신 바로
      // 원인을 알 수 있는 메시지를 준다.
      if (typeof parsed.blood !== "string" || typeof parsed.allergy !== "string" || typeof parsed.nonce !== "string") {
        throw new Error(
          '필수 항목(blood, allergy, nonce)이 빠져 있습니다 — wallet에서 복사한 전체 JSON인지 확인해주세요.',
        );
      }
      const blood = await verifyVP({
        vp: parsed.blood,
        trustAnchors: TRUST_ANCHORS,
        revokedCredentialIds: REVOKED_CREDENTIAL_IDS,
        expectedAudience: DEMO_AUDIENCE,
        expectedNonce: parsed.nonce,
      });
      const allergy = await verifyVP({
        vp: parsed.allergy,
        trustAnchors: TRUST_ANCHORS,
        revokedCredentialIds: REVOKED_CREDENTIAL_IDS,
        expectedAudience: DEMO_AUDIENCE,
        expectedNonce: parsed.nonce,
      });
      const mDL = parsed.mDL
        ? await verifyVP({
            vp: parsed.mDL,
            trustAnchors: TRUST_ANCHORS,
        revokedCredentialIds: REVOKED_CREDENTIAL_IDS,
            expectedAudience: DEMO_AUDIENCE,
            expectedNonce: parsed.nonce,
          })
        : null;
      const controlledSubstance = parsed.controlledSubstance
        ? await verifyVP({
            vp: parsed.controlledSubstance,
            trustAnchors: TRUST_ANCHORS,
            revokedCredentialIds: REVOKED_CREDENTIAL_IDS,
            expectedAudience: DEMO_AUDIENCE,
            expectedNonce: parsed.nonce,
          })
        : null;
      // 실제 검증(서명·신뢰앵커·폐기·nonce)은 이미 끝났다 — 아래 지연은
      // 순수 연출용이다(결과가 너무 순식간에 떠서 "진짜 확인했다"는 느낌이
      // 안 들었다는 피드백 반영). 검증 로직 자체와는 무관함.
      await new Promise((resolve) => setTimeout(resolve, 450));
      setBundle({
        blood,
        allergy,
        mDL,
        mDLTrusted: mDL?.issuer === MDL_ISSUER.did,
        controlledSubstance,
      });
    } catch (e) {
      if (e instanceof VerifyError) {
        setError(`VC 검증 실패: ${e.reason}`);
      } else {
        setError(`검증 오류: ${(e as Error).message}`);
      }
      setBundle(null);
    } finally {
      setVerifying(false);
    }
  };

  const loadDemoData = async () => {
    setDemoLoading(true);
    try {
      const vcs = await getPatientVCs();
      const payload = await buildVPPayload(vcs);
      await verifyText(payload);
    } catch (e) {
      setError(`데모 데이터 준비 실패: ${(e as Error).message}`);
    } finally {
      setDemoLoading(false);
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
          // stop()이 실패해도(이미 멈춰있는 등) 버튼이 "스캔 중..."에
          // 영원히 멈춰있지 않게 — 두 경우 모두 scanActive를 해제한다.
          void scannerRef.current
            ?.stop()
            .then(() => setScanActive(false))
            .catch(() => setScanActive(false));
        },
        () => {},
      );
    } catch (e) {
      setError(`카메라 시작 실패: ${(e as Error).message}. 페이스트를 사용하세요.`);
      setScanActive(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] md:px-6 md:py-10">
      <div className="relative mx-auto flex min-h-screen w-full max-w-lg flex-col bg-[var(--paper)] shadow-xl md:max-w-3xl md:min-h-0 md:overflow-hidden md:rounded-3xl md:shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--mist)] bg-[var(--paper)]/92 px-4 py-3 backdrop-blur">
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--paper)] text-base">
            🩺
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-[var(--ink)]">의사 화면</h1>
            <p className="truncate text-[11px] text-[var(--ink-2)]">
              {session ? `${session.hospitalName} · ${session.name} (${ROLE_LABEL[session.role]})` : "배지 로그인 전"}
            </p>
          </div>
          {session && (
            <button
              type="button"
              onClick={() => { badgeLogout(); setSession(null); }}
              className="flex-none rounded-full bg-[var(--paper)] px-3 py-1.5 text-xs font-medium text-[var(--ink-2)] active:bg-[var(--mist)]"
            >
              로그아웃
            </button>
          )}
          <Link
            to="/wallet"
            target="_blank"
            className="flex-none rounded-full bg-[var(--paper)] px-3 py-1.5 text-xs font-medium text-[var(--ink-2)] active:bg-[var(--mist)]"
          >
            ← 환자 wallet
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-8 pt-5">
          {!session && (
            <section className="rounded-3xl bg-[var(--surface)] p-6 shadow-sm">
              <p className="font-data text-[11px] uppercase tracking-[0.2em] text-[var(--ink-2)]">시연 · 직원 배지</p>
              <h2 className="mt-2 text-lg font-bold text-[var(--ink)]">배지 로그인이 필요해요</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--ink-2)]">
                의사 화면은 병원이 발급한 직원 배지(서명된 자격증명)로 로그인한 뒤에만 열려요. 병원 포털에서 병원을
                등록하고 배지를 발급한 다음 "이 배지로 로그인"을 누르세요. 배지에는 환자 정보가 없고, 폐기하면 바로
                막혀요.
              </p>
              <Link to="/hospital" className="mt-4 inline-block rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-extrabold text-white">
                병원 포털로 가기
              </Link>
            </section>
          )}

          {session && (
            <div role="tablist" aria-label="의사 화면 탭" className="mb-4 flex gap-1 rounded-2xl bg-[var(--surface)] p-1 shadow-sm">
              {(
                [
                  ["queue", "진료 대기열"],
                  ["emergency", "응급 신원 확인"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  role="tab"
                  type="button"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={`min-h-[40px] flex-1 rounded-xl text-sm font-bold transition ${
                    tab === key ? "bg-[var(--ink)] text-white" : "text-[var(--ink-2)] hover:bg-[var(--paper)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {session && tab === "queue" && (
            <>
              <QueuePanel onChange={() => setDataVersion((v) => v + 1)} />
              <IssuePanel session={session} version={dataVersion} />
            </>
          )}

          {session && tab === "emergency" && !bundle && !verifying && (
            <section className="rounded-3xl bg-[var(--surface)] p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-[var(--ink)]">환자 VP 입력</h2>
              <p className="mt-1 mb-4 text-xs text-[var(--ink-2)]">
                환자 wallet의 QR을 스캔하거나, 클립보드에서 ⌘V로 페이로드를 붙여넣으세요.
              </p>

              <div className="mb-4 flex gap-2">
                <button
                  onClick={startScan}
                  disabled={scanActive}
                  className="flex-1 rounded-full bg-[var(--ink)] py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {scanActive ? "스캔 중..." : "QR 스캔 시작"}
                </button>
                <button
                  onClick={() => verifyText(pasteValue)}
                  disabled={!pasteValue}
                  className="flex-1 rounded-full bg-[var(--ink)] py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  페이스트 검증
                </button>
              </div>

              <div id="qr-reader" className="mb-4 overflow-hidden rounded-2xl" />

              <textarea
                value={pasteValue}
                onChange={(e) => setPasteValue(e.target.value)}
                placeholder='wallet에서 복사한 JSON ({"blood":"...","allergy":"...","nonce":"..."[,"mDL":"..."]})'
                className="h-24 w-full rounded-2xl border border-[var(--mist)] p-3 font-mono text-xs outline-none focus:border-[var(--ink)]"
              />

              <div className="mt-4 border-t border-[var(--mist)] pt-4">
                <button
                  onClick={loadDemoData}
                  disabled={demoLoading}
                  className="w-full rounded-full border border-[var(--mist)] py-2.5 text-sm font-semibold text-[var(--ink-2)] active:bg-[var(--paper)] disabled:opacity-40"
                >
                  {demoLoading ? "준비 중..." : "데모 데이터로 먼저 보기"}
                </button>
                <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--ink-2)]">
                  wallet의 시드 환자 데이터로 실제 서명 검증을 거쳐 보여줍니다(가짜
                  화면이 아님) — QR·페이스트 없이 바로 결과를 확인하고 싶을 때.
                </p>
              </div>
            </section>
          )}

          {tab === "emergency" && verifying && (
            <section
              aria-busy="true"
              className="rounded-3xl bg-[var(--surface)] p-5 shadow-[0_1px_12px_rgba(11,59,60,0.07)]"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-[var(--ink)]">검증 중이에요</p>
                <span className="font-data text-[10px] font-bold text-[var(--ink-2)]">SD-JWT</span>
              </div>
              <ul className="mt-3 flex flex-col gap-2">
                {VERIFY_CHECKS.map((label) => (
                  <li key={label} className="flex items-center gap-3 text-sm text-[var(--ink-2)]">
                    <span className="h-5 w-5 flex-none animate-spin rounded-full border-2 border-[var(--mist)] border-t-[var(--ink)]" />
                    {label}
                  </li>
                ))}
              </ul>
              {/* 환자 카드 자리 — 결과가 들어올 곳을 미리 잡아둔다 */}
              <div className="mt-4 rounded-2xl bg-[var(--paper)] p-4">
                <Skeleton className="h-3 w-24" />
                <div className="mt-3 flex gap-3">
                  <Skeleton className="h-10 w-16" />
                  <Skeleton className="h-10 flex-1" />
                </div>
                <Skeleton className="mt-3 h-3 w-40" />
              </div>
            </section>
          )}

          {tab === "emergency" && error && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-2xl border-l-4 border-[var(--vital)] bg-[var(--vital)]/8 px-4 py-3 text-sm text-[var(--vital-ink)]"
            >
              <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[var(--vital)] text-xs font-bold text-white">
                !
              </span>
              <div className="flex-1">
                {error}
                <button
                  onClick={() => {
                    setError(null);
                    setPasteValue("");
                  }}
                  className="ml-2 text-xs font-medium underline"
                >
                  다시
                </button>
              </div>
            </div>
          )}

          {tab === "emergency" && bundle && (
            <section className="flex flex-col gap-4 animate-reveal-in">
              {bundle.mDLTrusted && (
                <div className="flex items-center gap-3 rounded-3xl bg-[var(--paper)] p-4">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--ink)] text-base text-white">
                    ✓
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                      <span className="truncate">Korean mDL Reference Issuer 서명 검증됨</span>
                      <span className="flex-none rounded-full bg-[var(--refund)]/12 px-2 py-0.5 font-data text-[10px] font-bold text-[var(--refund-ink)]">
                        검증됨
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--refund-ink)]">
                      환자 신원이 한국 mDL 표준 reference issuer로 anchor됨 (demo). 식별
                      정보는 환자 동의 하에 마스킹.
                    </div>
                  </div>
                </div>
              )}
              {!bundle.mDL && (
                <div className="rounded-2xl border-l-4 border-[var(--ink-2)] bg-[var(--surface)] px-4 py-3 text-xs leading-relaxed text-[var(--ink-2)]">
                  ID anchor: QR fast-path (mDL 미포함). 신원 확인이 필요하면 환자
                  wallet에서 페이로드 복사 후 페이스트로 mDL 포함된 full bundle 검증.
                </div>
              )}

              <div className="flex gap-2 rounded-full bg-[var(--paper)] p-1">
                <button
                  onClick={() => setMode("emergency")}
                  className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
                    mode === "emergency"
                      ? "bg-[var(--ink)] text-white"
                      : "text-[var(--ink-2)]"
                  }`}
                >
                  응급 모드
                </button>
                <button
                  onClick={() => setMode("controlled")}
                  className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
                    mode === "controlled"
                      ? "bg-[var(--ink)] text-white"
                      : "text-[var(--ink-2)]"
                  }`}
                >
                  관리약물 모드
                </button>
              </div>

              {mode === "emergency" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <PatientPanel bundle={bundle} />
                  <DDICheck
                    allergens={
                      (bundle.allergy.revealedClaims.allergens as string[]) ?? []
                    }
                    severity={
                      bundle.allergy.revealedClaims.severity as string | undefined
                    }
                  />
                </div>
              )}

              {mode === "controlled" &&
                (bundle.controlledSubstance ? (
                  <ControlledSubstancePanel
                    priorVisits={
                      (bundle.controlledSubstance.revealedClaims.priorVisits as {
                        hospital: string;
                        drug: string;
                        date: string;
                      }[]) ?? []
                    }
                  />
                ) : (
                  <div className="rounded-2xl border-l-4 border-[var(--ink-2)] bg-[var(--surface)] px-4 py-3 text-xs leading-relaxed text-[var(--ink-2)]">
                    관리약물 이력은 QR fast-path에 포함되지 않습니다. 환자 wallet에서
                    페이로드 복사 후 페이스트로 full bundle을 검증하세요.
                  </div>
                ))}

              <details className="rounded-2xl bg-[var(--surface)] p-4 text-xs shadow-sm">
                <summary className="cursor-pointer select-none text-sm font-medium text-[var(--ink)]">
                  검증 메타데이터 (dev tools 시연용)
                </summary>
                <pre className="mt-2 whitespace-pre-wrap break-all rounded-xl bg-[var(--paper)] p-3 text-[10px]">
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
                      mDL: bundle.mDL
                        ? {
                            issuer: bundle.mDL.issuer,
                            vct: bundle.mDL.vct,
                            revealed: bundle.mDL.revealedClaims,
                            hiddenCount: bundle.mDL.hiddenClaimNames.length,
                          }
                        : "(not provided in QR fast-path)",
                      controlledSubstance: bundle.controlledSubstance
                        ? {
                            issuer: bundle.controlledSubstance.issuer,
                            vct: bundle.controlledSubstance.vct,
                            hiddenCount:
                              bundle.controlledSubstance.hiddenClaimNames.length,
                          }
                        : "(not provided in QR fast-path)",
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
                className="self-start text-sm font-medium text-[var(--ink-2)] underline"
              >
                다시 입력
              </button>
            </section>
          )}
        </main>
      </div>
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
    <div className="rounded-3xl bg-[var(--surface)] p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">환자 정보 (마스킹됨)</h2>

      <dl className="space-y-2 text-sm">
        <Row label="이름" value={<Masked />} />
        <Row label="주민번호" value={<Masked />} />
        <Row label="주소" value={<Masked />} />
        <Row label="혈액형" value={<strong>{blood ?? "?"} {rh ?? ""}</strong>} />
        <Row
          label="알레르기"
          value={
            allergens && allergens.length > 0 ? (
              <strong className="text-[var(--vital-ink)]">
                {allergens.join(", ")}
                {severity && (
                  <span className="ml-2 text-xs font-normal text-[var(--vital-ink)]/70">
                    ({severity})
                  </span>
                )}
              </strong>
            ) : (
              <span className="text-[var(--ink-2)]">정보 없음</span>
            )
          }
        />
      </dl>
      <p className="mt-3 text-[10px] text-[var(--ink-2)]">
        ●●● = SD-JWT undisclosed digest (실제 데이터는 wallet에 보관됨, presentation에 포함되지 않음)
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="w-20 flex-none text-xs text-[var(--ink-2)]">{label}</dt>
      <dd className="text-[var(--ink)]">{value}</dd>
    </div>
  );
}

function Masked() {
  return <span className="font-mono text-[var(--mist)]">●●●</span>;
}
