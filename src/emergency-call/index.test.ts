import { describe, it, expect } from "vitest";
import {
  DEMO_DOCTOR,
  HOSPITAL_ISSUER,
  MDL_ISSUER,
  TRUST_ANCHORS,
  DEMO_AUDIENCE,
} from "../data/issuer-keys";
import { signVC, randomNonce } from "../lib/sdjwt";
import { presentRoleVC, verifyAndMatchPolicy } from "./index";

const POLICY = {
  allow: ["emergency_physician"],
  disclose: ["bloodType", "rhFactor", "allergens", "severity"],
};

function makeRoleVC(role: string, issuer = HOSPITAL_ISSUER) {
  return signVC({
    issuerPrivateKey: issuer.privateKey,
    issuerDid: issuer.did,
    holderDid: DEMO_DOCTOR.did,
    holderPubKey: DEMO_DOCTOR.publicKey,
    vct: "https://demo.medicalidentity.kr/verifier-role/v1",
    publicClaims: { role, hospital: "Demo General Hospital" },
    selectiveClaims: {},
    ttlSeconds: 60 * 60 * 12, // 12시간 교대 단위
  });
}

describe("emergency-call — policy matching (D1-D5, UI/전송 계층 없음)", () => {
  it("[#1] role이 policy.allow에 있으면 매칭되고 disclose 목록을 반환", async () => {
    const roleVC = await makeRoleVC("emergency_physician");
    const nonce = randomNonce();
    const presented = await presentRoleVC({
      roleVC,
      doctorPrivateKey: DEMO_DOCTOR.privateKey,
      doctorDid: DEMO_DOCTOR.did,
      audience: DEMO_AUDIENCE,
      nonce,
    });
    const result = await verifyAndMatchPolicy({
      presentedRoleVC: presented.compact,
      trustAnchors: TRUST_ANCHORS,
      revokedCredentialIds: new Set(),
      expectedAudience: DEMO_AUDIENCE,
      expectedNonce: nonce,
      policy: POLICY,
    });
    expect(result.matched).toBe(true);
    expect(result.disclose).toEqual(POLICY.disclose);
  });

  it("[#2] role이 policy.allow에 없으면 매칭 실패 — 아무것도 공개 안 함", async () => {
    const roleVC = await makeRoleVC("nurse"); // policy.allow엔 emergency_physician만 있음
    const nonce = randomNonce();
    const presented = await presentRoleVC({
      roleVC,
      doctorPrivateKey: DEMO_DOCTOR.privateKey,
      doctorDid: DEMO_DOCTOR.did,
      audience: DEMO_AUDIENCE,
      nonce,
    });
    const result = await verifyAndMatchPolicy({
      presentedRoleVC: presented.compact,
      trustAnchors: TRUST_ANCHORS,
      revokedCredentialIds: new Set(),
      expectedAudience: DEMO_AUDIENCE,
      expectedNonce: nonce,
      policy: POLICY,
    });
    expect(result.matched).toBe(false);
    expect(result.disclose).toEqual([]);
    expect(result.reason).toMatch(/policy\.allow/);
  });

  it("[#3] 폐기된 role VC(jti)는 발급자가 신뢰돼도 매칭 거부", async () => {
    const roleVC = await makeRoleVC("emergency_physician");
    const pl = roleVC.jws.split(".")[1];
    const std = (pl + "=".repeat((4 - (pl.length % 4)) % 4))
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const { jti } = JSON.parse(atob(std)) as { jti: string };

    const nonce = randomNonce();
    const presented = await presentRoleVC({
      roleVC,
      doctorPrivateKey: DEMO_DOCTOR.privateKey,
      doctorDid: DEMO_DOCTOR.did,
      audience: DEMO_AUDIENCE,
      nonce,
    });
    const result = await verifyAndMatchPolicy({
      presentedRoleVC: presented.compact,
      trustAnchors: TRUST_ANCHORS, // 발급자(병원)는 여전히 신뢰됨
      revokedCredentialIds: new Set([jti]), // 이 디바이스(도난 등)만 개별 폐기
      expectedAudience: DEMO_AUDIENCE,
      expectedNonce: nonce,
      policy: POLICY,
    });
    expect(result.matched).toBe(false);
    expect(result.reason).toMatch(/revoked credential/);
  });

  it("[#4] 신뢰되지 않은 발급자의 role VC는 매칭 거부", async () => {
    // HOSPITAL_ISSUER가 아니라 MDL_ISSUER가 서명 — role VC는 병원만 발급 가능해야 함.
    const roleVC = await makeRoleVC("emergency_physician", MDL_ISSUER);
    const nonce = randomNonce();
    const presented = await presentRoleVC({
      roleVC,
      doctorPrivateKey: DEMO_DOCTOR.privateKey,
      doctorDid: DEMO_DOCTOR.did,
      audience: DEMO_AUDIENCE,
      nonce,
    });
    const result = await verifyAndMatchPolicy({
      presentedRoleVC: presented.compact,
      trustAnchors: { [HOSPITAL_ISSUER.did]: HOSPITAL_ISSUER.publicKey }, // mDL 발급자 제외
      revokedCredentialIds: new Set(),
      expectedAudience: DEMO_AUDIENCE,
      expectedNonce: nonce,
      policy: POLICY,
    });
    expect(result.matched).toBe(false);
    expect(result.reason).toMatch(/untrusted issuer/);
  });
});
