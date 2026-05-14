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
    // Tamper: flip one char in the JWS signature segment (still valid b64u shape).
    const parts = vp.compact.split("~");
    const jws = parts[0];
    const [h, pl, sig] = jws.split(".");
    const lastCh = sig[sig.length - 1];
    const swap = lastCh === "A" ? "B" : "A";
    const tamperedSig = sig.slice(0, -1) + swap;
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
});
