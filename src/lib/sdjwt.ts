// SD-JWT VC wrapper — `@sd-jwt/sd-jwt-vc` (표준 라이브러리, T2 eng-review) 위에
// 이 앱의 sign/present/verify 시그니처를 유지하는 얇은 레이어.
//
// [1차 구현 — 2026-09-30, 더 다듬을 부분 있음]
//   - publicClaims/revealedClaims 구분을 라이브러리가 merge한 payload에서
//     다시 쪼개지 않고 있음 (revealedClaims에 예약 필드까지 섞여 들어감).
//   - 에러 메시지가 라이브러리 원문 그대로 노출되는 곳이 있어, 기존
//     "❌ VC 검증 실패: aud mismatch" 같은 문구와 100% 동일하지 않을 수 있음.
//   - 여러 발급자 지원을 위해 verifyVP가 검증 직전 payload를 한 번 더
//     디코드(unverified)해서 트러스트 앵커를 고르는 방식 — 라이브러리 기본
//     흐름과 살짝 다름.
// 위 항목들은 별도로 신중히 재검토할 것.

import { SDJwtVcInstance } from "@sd-jwt/sd-jwt-vc";
import type { Hasher, Signer, Verifier, KbVerifier } from "@sd-jwt/types";
import { ed25519 } from "@noble/curves/ed25519";
import { sha256 } from "@noble/hashes/sha256";
import { toB64u } from "../data/issuer-keys";

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}
function fromUtf8(b: Uint8Array): string {
  return new TextDecoder().decode(b);
}
function b64uEncode(s: string): string {
  return toB64u(utf8(s));
}
function b64uDecode(s: string): string {
  const pad = s + "=".repeat((4 - (s.length % 4)) % 4);
  const std = pad.replace(/-/g, "+").replace(/_/g, "/");
  return fromUtf8(Uint8Array.from(atob(std), (c) => c.charCodeAt(0)));
}
function b64uToBytes(s: string): Uint8Array {
  const pad = s + "=".repeat((4 - (s.length % 4)) % 4);
  const std = pad.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(std), (c) => c.charCodeAt(0));
}

export interface VCPayload {
  iss: string; // issuer DID
  iat: number;
  exp: number;
  vct: string; // vc type
  sub: string; // holder DID
  jti: string; // credential ID — revocation targets this, not the issuer
  cnf?: { jwk?: { kty: "OKP"; crv: "Ed25519"; x: string } };
  [key: string]: unknown;
}

function randomJti(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return toB64u(buf);
}

export type Disclosure = [salt: string, name: string, value: unknown];

function decodeDisclosure(s: string): Disclosure {
  return JSON.parse(b64uDecode(s)) as Disclosure;
}

const hasher: Hasher = (data, _alg) => {
  const bytes = typeof data === "string" ? utf8(data) : new Uint8Array(data);
  return sha256(bytes);
};

function makeSigner(privateKey: Uint8Array): Signer {
  return (data: string) => toB64u(ed25519.sign(utf8(data), privateKey));
}

function makeVerifier(publicKey: Uint8Array): Verifier {
  return (data: string, sig: string) =>
    ed25519.verify(b64uToBytes(sig), utf8(data), publicKey);
}

const kbVerifier: KbVerifier = (data, sig, payload) => {
  const x = (payload as VCPayload).cnf?.jwk?.x;
  if (!x) return false;
  return ed25519.verify(b64uToBytes(sig), utf8(data), b64uToBytes(x));
};

function saltGenerator(length: number): string {
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  return toB64u(buf);
}

export interface SignedVC {
  jws: string; // header.payload.signature (앞부분, disclosure 없음)
  disclosures: Disclosure[]; // 서명 시점에 만들어진 전체 disclosure (열람 가능)
  /** Full compact serialization: `jws~enc(d1)~enc(d2)~...` */
  compact: string;
}

export interface SignParams {
  issuerPrivateKey: Uint8Array;
  issuerDid: string;
  holderDid: string;
  holderPubKey: Uint8Array;
  vct: string;
  publicClaims: Record<string, unknown>;
  selectiveClaims: Record<string, unknown>;
  ttlSeconds?: number;
}

export async function signVC(p: SignParams): Promise<SignedVC> {
  const now = Math.floor(Date.now() / 1000);

  const instance = new SDJwtVcInstance({
    signer: makeSigner(p.issuerPrivateKey),
    signAlg: "EdDSA",
    hasher,
    hashAlg: "sha-256",
    saltGenerator,
  });

  const payload = {
    iss: p.issuerDid,
    iat: now,
    exp: now + (p.ttlSeconds ?? 300),
    vct: p.vct,
    sub: p.holderDid,
    jti: randomJti(),
    cnf: { jwk: { kty: "OKP", crv: "Ed25519", x: toB64u(p.holderPubKey) } },
    ...p.publicClaims,
    ...p.selectiveClaims,
  };

  // Object.keys() 결과는 string[]이라 DisclosureFrame<typeof payload>의 리터럴
  // 키 유니언과 정확히 맞지 않는다 — selectiveClaims가 런타임에 동적으로 정해지는
  // 이 앱의 설계상 불가피한 캐스트.
  const disclosureFrame = { _sd: Object.keys(p.selectiveClaims) } as Parameters<
    typeof instance.issue<typeof payload>
  >[1];

  const compact = await instance.issue(payload, disclosureFrame, {
    header: { kid: p.issuerDid },
  });

  const segments = compact.split("~");
  const jws = segments[0];
  const disclosures = segments
    .slice(1)
    .filter((s) => s.length > 0)
    .map(decodeDisclosure);

  return { jws, disclosures, compact };
}

export interface PresentParams {
  vc: SignedVC;
  revealClaimNames: string[]; // which selective claim names to include
  holderPrivateKey: Uint8Array;
  holderDid: string;
  audience: string;
  nonce: string;
}

export interface PresentedVP {
  /** Compact: `jws~enc(disclosed1)~enc(disclosed2)~kb-jwt` */
  compact: string;
  kb: string; // KB-JWT (holder-signed key binding)
  revealed: Disclosure[];
}

export async function presentVP(p: PresentParams): Promise<PresentedVP> {
  const instance = new SDJwtVcInstance({
    hasher,
    kbSigner: makeSigner(p.holderPrivateKey),
    kbSignAlg: "EdDSA",
  });

  const presentationFrame = Object.fromEntries(
    p.revealClaimNames.map((name) => [name, true]),
  );

  const compact = await instance.present(p.vc.compact, presentationFrame, {
    kb: {
      payload: {
        iat: Math.floor(Date.now() / 1000),
        aud: p.audience,
        nonce: p.nonce,
      },
    },
  });

  const kb = compact.split("~").pop() as string;
  const revealed = p.vc.disclosures.filter(([, name]) =>
    p.revealClaimNames.includes(name),
  );

  return { compact, kb, revealed };
}

export interface VerifyParams {
  vp: string; // compact
  trustAnchors: Record<string, Uint8Array>;
  expectedAudience: string;
  expectedNonce?: string;
  now?: number;
  /** Revoked individual credential IDs (jti) — distinct from trustAnchors
   * (issuer allow-list). An issuer can stay trusted while one of its VCs
   * is individually revoked. */
  revokedCredentialIds?: ReadonlySet<string>;
}

export interface VerifyResult {
  ok: true;
  issuer: string;
  holderDid: string;
  vct: string;
  revealedClaims: Record<string, unknown>;
  publicClaims: Record<string, unknown>;
  hiddenClaimNames: string[];
  payload: VCPayload;
  kbAudience: string;
  kbNonce: string;
}

export class VerifyError extends Error {
  constructor(public reason: string) {
    super(reason);
    this.name = "VerifyError";
  }
}

export async function verifyVP(p: VerifyParams): Promise<VerifyResult> {
  const parts = p.vp.split("~");
  if (parts.length < 2) throw new VerifyError("malformed VP");
  const [h, pl] = parts[0].split(".");
  if (!h || !pl) throw new VerifyError("malformed JWS");

  // 트러스트 앵커를 고르려면 issuer를 먼저 알아야 하므로, 서명 검증 전에
  // payload를 한 번 미리 디코드한다 (아직 신뢰 안 함 — 아래에서 라이브러리가
  // 실제 서명 검증을 한다).
  let unverified: VCPayload;
  try {
    unverified = JSON.parse(b64uDecode(pl)) as VCPayload;
  } catch {
    throw new VerifyError("malformed payload");
  }
  const issuerKey = p.trustAnchors[unverified.iss];
  if (!issuerKey) throw new VerifyError(`untrusted issuer: ${unverified.iss}`);

  if (p.revokedCredentialIds?.has(unverified.jti)) {
    throw new VerifyError(`revoked credential: ${unverified.jti}`);
  }

  const totalSelective = Array.isArray(unverified._sd)
    ? (unverified._sd as unknown[]).length
    : 0;
  const revealedSegmentCount = parts.length - 2; // exclude jws + kb-jwt

  const instance = new SDJwtVcInstance({
    hasher,
    verifier: makeVerifier(issuerKey),
    kbVerifier,
  });

  let result: Awaited<ReturnType<typeof instance.verify>>;
  try {
    result = await instance.verify(p.vp, [], true);
  } catch (e) {
    throw new VerifyError((e as Error).message);
  }

  const payload = result.payload as VCPayload;

  const now = p.now ?? Math.floor(Date.now() / 1000);
  if (payload.exp < now) throw new VerifyError("expired");

  const kbPayload = result.kb?.payload as
    | { aud: string; nonce: string }
    | undefined;
  if (!kbPayload) throw new VerifyError("missing KB-JWT");
  if (kbPayload.aud !== p.expectedAudience)
    throw new VerifyError(`aud mismatch: got ${kbPayload.aud}`);
  if (p.expectedNonce && kbPayload.nonce !== p.expectedNonce)
    throw new VerifyError("nonce mismatch");

  // 라이브러리 verify()가 공개된 disclosure를 payload에 직접 merge해서 돌려준다
  // (숨겨진 클레임은 아예 안 보임, _sd/_sd_alg는 제거됨). revealedClaims를
  // publicClaims와 엄밀히 분리하지 않는 건 알려진 한계(파일 상단 주석 참고).
  const reserved = new Set([
    "iss",
    "iat",
    "exp",
    "vct",
    "sub",
    "jti",
    "cnf",
    "_sd",
    "_sd_alg",
  ]);
  const revealedClaims: Record<string, unknown> = {};
  const publicClaims: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (reserved.has(k)) continue;
    revealedClaims[k] = v;
  }

  const hiddenCount = Math.max(0, totalSelective - revealedSegmentCount);
  const hiddenClaimNames = Array.from({ length: hiddenCount }, () => "●●●");

  return {
    ok: true,
    issuer: payload.iss,
    holderDid: payload.sub,
    vct: payload.vct,
    revealedClaims,
    publicClaims,
    hiddenClaimNames,
    payload,
    kbAudience: kbPayload.aud,
    kbNonce: kbPayload.nonce,
  };
}

// 알려진 한계 (eng-review 2026-09-30, D7 — 의도적으로 컷됨, TODOS.md TODO-2):
// nonce를 검증자(의사) 쪽이 아니라 wallet(환자) 쪽에서 생성한다. 표준 SD-JWT
// 흐름이라면 verifier가 challenge를 먼저 발급해야 QR 재사용(replay) 공격을
// 막을 수 있지만, 그러려면 wallet에 QR 스캔 기능이 새로 필요해 "환자가 의식
// 없는 응급 상황"이라는 이 제품의 핵심 시나리오와 설계상 충돌한다 (wallet이
// 능동적으로 스캔해야 하므로). 1주일 스프린트에서는 이 트레이드오프를 그대로
// 받아들이고, challenge-response 재설계는 별도 연구 트랙(TODO-2)으로 이관했다.
// 프로덕션에서는 NFC/BLE 등 환자 능동 조작이 필요 없는 채널로 challenge를
// 전달하는 방식을 우선 검토할 것 (TODOS.md TODO-1 참고).
export function randomNonce(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return toB64u(buf);
}
