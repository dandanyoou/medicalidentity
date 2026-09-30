import { describe, it, expect } from "vitest";
import {
  DEMO_HOLDER,
  HOSPITAL_ISSUER,
  MDL_ISSUER,
  TRUST_ANCHORS,
  DEMO_AUDIENCE,
} from "../data/issuer-keys";
import {
  signVC,
  presentVP,
  verifyVP,
  randomNonce,
  VerifyError,
} from "./sdjwt";

function makeBloodVC() {
  return signVC({
    issuerPrivateKey: HOSPITAL_ISSUER.privateKey,
    issuerDid: HOSPITAL_ISSUER.did,
    holderDid: DEMO_HOLDER.did,
    holderPubKey: DEMO_HOLDER.publicKey,
    vct: "blood/v1",
    publicClaims: {},
    selectiveClaims: { name: "김단유", bloodType: "A", rhFactor: "+" },
    ttlSeconds: 60,
  });
}

describe("sdjwt", () => {
  it("[#1] sign → present → verify happy path round trip", () => {
    const vc = makeBloodVC();
    const vp = presentVP({
      vc,
      revealClaimNames: ["bloodType", "rhFactor"],
      holderPrivateKey: DEMO_HOLDER.privateKey,
      holderDid: DEMO_HOLDER.did,
      audience: DEMO_AUDIENCE,
      nonce: randomNonce(),
    });
    const result = verifyVP({
      vp: vp.compact,
      trustAnchors: TRUST_ANCHORS,
      expectedAudience: DEMO_AUDIENCE,
    });
    expect(result.ok).toBe(true);
    expect(result.revealedClaims.bloodType).toBe("A");
    expect(result.revealedClaims.rhFactor).toBe("+");
    expect(result.revealedClaims.name).toBeUndefined();
    expect(result.hiddenClaimNames.length).toBe(1); // name is hidden
  });

  it("[#2] verifyVP throws on aud mismatch", () => {
    const vc = makeBloodVC();
    const vp = presentVP({
      vc,
      revealClaimNames: ["bloodType"],
      holderPrivateKey: DEMO_HOLDER.privateKey,
      holderDid: DEMO_HOLDER.did,
      audience: DEMO_AUDIENCE,
      nonce: randomNonce(),
    });
    expect(() =>
      verifyVP({
        vp: vp.compact,
        trustAnchors: TRUST_ANCHORS,
        expectedAudience: "wrong-audience",
      }),
    ).toThrow(VerifyError);
  });

  it("[#3] verifyVP throws on exp past", () => {
    const vc = signVC({
      issuerPrivateKey: HOSPITAL_ISSUER.privateKey,
      issuerDid: HOSPITAL_ISSUER.did,
      holderDid: DEMO_HOLDER.did,
      holderPubKey: DEMO_HOLDER.publicKey,
      vct: "test/v1",
      publicClaims: {},
      selectiveClaims: { bloodType: "A" },
      ttlSeconds: 1,
    });
    const vp = presentVP({
      vc,
      revealClaimNames: ["bloodType"],
      holderPrivateKey: DEMO_HOLDER.privateKey,
      holderDid: DEMO_HOLDER.did,
      audience: DEMO_AUDIENCE,
      nonce: randomNonce(),
    });
    expect(() =>
      verifyVP({
        vp: vp.compact,
        trustAnchors: TRUST_ANCHORS,
        expectedAudience: DEMO_AUDIENCE,
        now: Math.floor(Date.now() / 1000) + 10, // 10s in future
      }),
    ).toThrow(/expired/);
  });

  it("[#4] verifyVP throws on invalid issuer signature (tampered sig)", () => {
    const vc = makeBloodVC();
    const vp = presentVP({
      vc,
      revealClaimNames: ["bloodType"],
      holderPrivateKey: DEMO_HOLDER.privateKey,
      holderDid: DEMO_HOLDER.did,
      audience: DEMO_AUDIENCE,
      nonce: randomNonce(),
    });
    // Tamper: flip one char in the MIDDLE of the JWS signature segment (still
    // valid b64u shape). Avoid the last character — in an unpadded base64url
    // encoding of a 64-byte signature, the final char only carries 2
    // significant bits, so some byte values make an "A"<->"B" swap there a
    // no-op after decoding (flaky test, not a real crypto weakness).
    const parts = vp.compact.split("~");
    const jws = parts[0];
    const [h, pl, sig] = jws.split(".");
    const mid = Math.floor(sig.length / 2);
    const midCh = sig[mid];
    const swap = midCh === "A" ? "B" : "A";
    const tamperedSig = sig.slice(0, mid) + swap + sig.slice(mid + 1);
    parts[0] = `${h}.${pl}.${tamperedSig}`;
    const tampered = parts.join("~");
    expect(() =>
      verifyVP({
        vp: tampered,
        trustAnchors: TRUST_ANCHORS,
        expectedAudience: DEMO_AUDIENCE,
      }),
    ).toThrow(/invalid issuer signature/);
  });

  it("[#5] verifyVP throws on untrusted issuer (anchor mismatch)", () => {
    const vc = makeBloodVC();
    const vp = presentVP({
      vc,
      revealClaimNames: ["bloodType"],
      holderPrivateKey: DEMO_HOLDER.privateKey,
      holderDid: DEMO_HOLDER.did,
      audience: DEMO_AUDIENCE,
      nonce: randomNonce(),
    });
    expect(() =>
      verifyVP({
        vp: vp.compact,
        trustAnchors: { [MDL_ISSUER.did]: MDL_ISSUER.publicKey }, // hospital removed
        expectedAudience: DEMO_AUDIENCE,
      }),
    ).toThrow(/untrusted issuer/);
  });

  it("[#6] mDL-style 0-disclosure presentation (issuer signature anchor only)", () => {
    const mDL = signVC({
      issuerPrivateKey: MDL_ISSUER.privateKey,
      issuerDid: MDL_ISSUER.did,
      holderDid: DEMO_HOLDER.did,
      holderPubKey: DEMO_HOLDER.publicKey,
      vct: "mdl/v1",
      publicClaims: {},
      selectiveClaims: { name: "김단유", residentNumber: "940123-1******" },
      ttlSeconds: 60,
    });
    const vp = presentVP({
      vc: mDL,
      revealClaimNames: [],
      holderPrivateKey: DEMO_HOLDER.privateKey,
      holderDid: DEMO_HOLDER.did,
      audience: DEMO_AUDIENCE,
      nonce: randomNonce(),
    });
    const result = verifyVP({
      vp: vp.compact,
      trustAnchors: TRUST_ANCHORS,
      expectedAudience: DEMO_AUDIENCE,
    });
    expect(result.ok).toBe(true);
    expect(result.issuer).toBe(MDL_ISSUER.did);
    expect(Object.keys(result.revealedClaims).length).toBe(0);
    expect(result.hiddenClaimNames.length).toBe(2); // both masked
  });

  it("[#7] salt makes identical claim values unlinkable across VCs", () => {
    // 혈액형처럼 경우의 수가 적은 값이라도, salt가 매번 랜덤이면 같은 값에 대해
    // 서로 다른 두 VC의 _sd 해시가 절대 겹치지 않는다 (해시 대입 역산 방지).
    const vc1 = makeBloodVC();
    const vc2 = makeBloodVC();
    expect(vc1.jws).not.toBe(vc2.jws); // different iat -> different payload/sig too
    const sorted1 = [...vc1.disclosures].sort(([, a], [, b]) => a.localeCompare(b));
    const sorted2 = [...vc2.disclosures].sort(([, a], [, b]) => a.localeCompare(b));
    for (let i = 0; i < sorted1.length; i++) {
      const [salt1, name1, value1] = sorted1[i];
      const [salt2, name2, value2] = sorted2[i];
      expect(name1).toBe(name2);
      expect(value1).toBe(value2); // same claim value in both
      expect(salt1).not.toBe(salt2); // but salt differs -> different digest
    }
  });

  it("[#8] verifyVP throws on revoked credential (jti), even from a trusted issuer", () => {
    const vc = makeBloodVC();
    const vp = presentVP({
      vc,
      revealClaimNames: ["bloodType"],
      holderPrivateKey: DEMO_HOLDER.privateKey,
      holderDid: DEMO_HOLDER.did,
      audience: DEMO_AUDIENCE,
      nonce: randomNonce(),
    });
    const pl = vc.jws.split(".")[1];
    const std = (pl + "=".repeat((4 - (pl.length % 4)) % 4))
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const payload = JSON.parse(atob(std)) as { jti: string };
    expect(() =>
      verifyVP({
        vp: vp.compact,
        trustAnchors: TRUST_ANCHORS, // issuer still trusted
        expectedAudience: DEMO_AUDIENCE,
        revokedCredentialIds: new Set([payload.jti]), // but this one VC is revoked
      }),
    ).toThrow(/revoked credential/);
  });
});
