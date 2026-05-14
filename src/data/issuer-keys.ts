// 데모 전용 ed25519 키페어. 절대 프로덕션에 사용 금지.
// "Korean mDL Reference Issuer (Demo)" + "Demo Hospital Issuer" + demo holder.
// base64url 인코딩된 32-byte private keys.

import { ed25519 } from "@noble/curves/ed25519";

export function toB64u(b: Uint8Array): string {
  let s = "";
  for (const byte of b) s += String.fromCharCode(byte);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromHex(s: string): Uint8Array {
  if (s.length % 2 !== 0) throw new Error("odd hex length");
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

// 32-byte hex demo seeds. NEVER use in production.
const MDL_SK_HEX =
  "010203040506070809101112131415161718192021222324252627282930313a";
const HOSP_SK_HEX =
  "414243444546474849505152535455565758596061626364656667686970713b";
const HOLDER_SK_HEX =
  "818283848586878889909192939495969798990001020304050607080910113c";

export interface DemoKey {
  id: string;
  label: string;
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  did: string;
}

function makeKey(id: string, label: string, hex: string): DemoKey {
  const sk = fromHex(hex);
  if (sk.length !== 32) {
    throw new Error(`Demo key ${id} must be 32 bytes (got ${sk.length})`);
  }
  const pk = ed25519.getPublicKey(sk);
  const did = `did:key:demo-${id}-${toB64u(pk).slice(0, 12)}`;
  return { id, label, privateKey: sk, publicKey: pk, did };
}

export const MDL_ISSUER = makeKey(
  "mdl-ref",
  "Korean mDL Reference Issuer (Demo)",
  MDL_SK_HEX,
);
export const HOSPITAL_ISSUER = makeKey(
  "hospital",
  "Demo Hospital Issuer",
  HOSP_SK_HEX,
);
export const DEMO_HOLDER = makeKey(
  "holder",
  "Demo Patient Holder",
  HOLDER_SK_HEX,
);

export const TRUST_ANCHORS: Record<string, Uint8Array> = {
  [MDL_ISSUER.did]: MDL_ISSUER.publicKey,
  [HOSPITAL_ISSUER.did]: HOSPITAL_ISSUER.publicKey,
};

export const DEMO_AUDIENCE = "hackathon-demo-2026";
