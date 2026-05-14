// 데모용 SD-JWT-like wrapper.
// 표준 SD-JWT VC를 100% 준수하는 대신 핵심 의미만 보존하는 단순화:
//   - 빌드 타임 사전 서명된 VC: header.payload.signature (compact JWS) +
//     `~`로 구분된 disclosure 페이로드 (claim_name, value 쌍).
//   - presentVP가 disclosure 부분집합만 노출.
//   - verifyVP가 issuer 서명·aud·exp·trust anchor 검증.
//
// 프로덕션은 `@sd-jwt/sd-jwt-vc` 의 정식 SD-JWT VC 흐름 사용 권장 (디스클로저
// 해시·솔트·KB-JWT 등). 본 데모는 30초 시연용으로 충분한 정합성만 유지.

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

export interface VCHeader {
  alg: "EdDSA";
  typ: "vc+sd-jwt";
  kid?: string;
}

export interface VCPayload {
  iss: string; // issuer DID
  iat: number;
  exp: number;
  vct: string; // vc type
  sub: string; // holder DID
  cnf?: { jwk?: { kty: "OKP"; crv: "Ed25519"; x: string } };
  // public claims included in JWT payload directly
  [key: string]: unknown;
}

export type Disclosure = [name: string, value: unknown];

export interface SignedVC {
  jws: string; // header.payload.signature
  disclosures: Disclosure[]; // separately attached (revealable claims)
  /** Full compact serialization: `jws~enc(d1)~enc(d2)~...` */
  compact: string;
}

function encodeDisclosure(d: Disclosure): string {
  return b64uEncode(JSON.stringify(d));
}

function decodeDisclosure(s: string): Disclosure {
  return JSON.parse(b64uDecode(s)) as Disclosure;
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

export function signVC(p: SignParams): SignedVC {
  const now = Math.floor(Date.now() / 1000);
  const header: VCHeader = { alg: "EdDSA", typ: "vc+sd-jwt", kid: p.issuerDid };

  const sdHashes = Object.keys(p.selectiveClaims).map((k) =>
    toB64u(sha256(utf8(`${k}:${JSON.stringify(p.selectiveClaims[k])}`))),
  );

  const payload: VCPayload = {
    iss: p.issuerDid,
    iat: now,
    exp: now + (p.ttlSeconds ?? 300),
    vct: p.vct,
    sub: p.holderDid,
    cnf: { jwk: { kty: "OKP", crv: "Ed25519", x: toB64u(p.holderPubKey) } },
    _sd_alg: "SHA-256",
    _sd: sdHashes,
    ...p.publicClaims,
  };

  const h = b64uEncode(JSON.stringify(header));
  const pl = b64uEncode(JSON.stringify(payload));
  const signingInput = `${h}.${pl}`;
  const sig = ed25519.sign(utf8(signingInput), p.issuerPrivateKey);
  const jws = `${signingInput}.${toB64u(sig)}`;

  const disclosures: Disclosure[] = Object.entries(p.selectiveClaims);
  const disclosureSegments = disclosures.map(encodeDisclosure);
  const compact = [jws, ...disclosureSegments].join("~");

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

export function presentVP(p: PresentParams): PresentedVP {
  const revealed = p.vc.disclosures.filter(([name]) =>
    p.revealClaimNames.includes(name),
  );

  const disclosureSegments = revealed.map(encodeDisclosure);
  const vpBase = [p.vc.jws, ...disclosureSegments].join("~");

  const sdHash = toB64u(sha256(utf8(vpBase + "~")));
  const kbHeader: VCHeader = { alg: "EdDSA", typ: "vc+sd-jwt" };
  const kbPayload = {
    iat: Math.floor(Date.now() / 1000),
    aud: p.audience,
    nonce: p.nonce,
    sd_hash: sdHash,
    sub: p.holderDid,
  };
  const kh = b64uEncode(JSON.stringify(kbHeader));
  const kp = b64uEncode(JSON.stringify(kbPayload));
  const kbSig = ed25519.sign(utf8(`${kh}.${kp}`), p.holderPrivateKey);
  const kb = `${kh}.${kp}.${toB64u(kbSig)}`;

  return { compact: `${vpBase}~${kb}`, kb, revealed };
}

export interface VerifyParams {
  vp: string; // compact
  trustAnchors: Record<string, Uint8Array>;
  expectedAudience: string;
  expectedNonce?: string;
  now?: number;
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

export function verifyVP(p: VerifyParams): VerifyResult {
  const parts = p.vp.split("~");
  if (parts.length < 2) throw new VerifyError("malformed VP");
  const jws = parts[0];
  const kb = parts[parts.length - 1];
  const disclosureSegs = parts.slice(1, parts.length - 1);

  const [h, pl, sig] = jws.split(".");
  if (!h || !pl || !sig) throw new VerifyError("malformed JWS");

  const payload = JSON.parse(b64uDecode(pl)) as VCPayload;
  const issuerKey = p.trustAnchors[payload.iss];
  if (!issuerKey) throw new VerifyError(`untrusted issuer: ${payload.iss}`);

  const issuerOk = ed25519.verify(
    b64uToBytes(sig),
    utf8(`${h}.${pl}`),
    issuerKey,
  );
  if (!issuerOk) throw new VerifyError("invalid issuer signature");

  const now = p.now ?? Math.floor(Date.now() / 1000);
  if (payload.exp < now) throw new VerifyError("expired");

  // Verify KB-JWT (holder binding)
  const [kh, kp, ksig] = kb.split(".");
  if (!kh || !kp || !ksig) throw new VerifyError("malformed KB-JWT");
  const kbPayload = JSON.parse(b64uDecode(kp)) as {
    aud: string;
    nonce: string;
    sd_hash: string;
    sub: string;
    iat: number;
  };
  if (kbPayload.aud !== p.expectedAudience)
    throw new VerifyError(`aud mismatch: got ${kbPayload.aud}`);
  if (p.expectedNonce && kbPayload.nonce !== p.expectedNonce)
    throw new VerifyError("nonce mismatch");

  const cnfX = payload.cnf?.jwk?.x;
  if (!cnfX) throw new VerifyError("missing holder cnf");
  const holderPub = b64uToBytes(cnfX);
  const kbOk = ed25519.verify(b64uToBytes(ksig), utf8(`${kh}.${kp}`), holderPub);
  if (!kbOk) throw new VerifyError("invalid KB-JWT signature");

  // Parse disclosures, validate against _sd hashes.
  const revealedClaims: Record<string, unknown> = {};
  const sdSet = new Set(payload._sd as string[]);
  for (const seg of disclosureSegs) {
    const [name, value] = decodeDisclosure(seg);
    const expectedHash = toB64u(
      sha256(utf8(`${name}:${JSON.stringify(value)}`)),
    );
    if (!sdSet.has(expectedHash))
      throw new VerifyError(`disclosure not in _sd: ${name}`);
    revealedClaims[name] = value;
  }

  // Public claims: everything in payload not in {iss,iat,exp,vct,sub,cnf,_sd,_sd_alg}.
  const reserved = new Set([
    "iss",
    "iat",
    "exp",
    "vct",
    "sub",
    "cnf",
    "_sd",
    "_sd_alg",
  ]);
  const publicClaims: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (!reserved.has(k)) publicClaims[k] = v;
  }

  // Hidden = total _sd minus disclosed (we cannot recover names, mark as ●●●).
  const hiddenCount = sdSet.size - disclosureSegs.length;
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

export function randomNonce(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return toB64u(buf);
}
