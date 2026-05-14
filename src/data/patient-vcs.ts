// 환자용 데모 VC 3개를 빌드 타임(런타임 첫 호출)에 서명·캐싱.
// 디자인 문서 명세: 빌드 타임 pre-signed. 본 데모는 모듈 첫 import 시 1회 서명 → memoize.

import {
  DEMO_HOLDER,
  HOSPITAL_ISSUER,
  MDL_ISSUER,
} from "./issuer-keys";
import { signVC, type SignedVC } from "../lib/sdjwt";

export interface PatientVCs {
  mDL: SignedVC;
  bloodType: SignedVC;
  allergy: SignedVC;
}

let cached: PatientVCs | null = null;

export function getPatientVCs(): PatientVCs {
  if (cached) return cached;

  const holderDid = DEMO_HOLDER.did;
  const holderPubKey = DEMO_HOLDER.publicKey;

  const mDL = signVC({
    issuerPrivateKey: MDL_ISSUER.privateKey,
    issuerDid: MDL_ISSUER.did,
    holderDid,
    holderPubKey,
    vct: "https://demo.medicalidentity.kr/mdl/v1",
    publicClaims: {},
    selectiveClaims: {
      name: "김단유",
      residentNumber: "940123-1******",
      birthDate: "1994-01-23",
      address: "서울특별시 강남구 테헤란로 100",
      licenseClass: "1종 보통",
    },
    ttlSeconds: 60 * 60 * 24,
  });

  const bloodType = signVC({
    issuerPrivateKey: HOSPITAL_ISSUER.privateKey,
    issuerDid: HOSPITAL_ISSUER.did,
    holderDid,
    holderPubKey,
    vct: "https://demo.medicalidentity.kr/blood/v1",
    publicClaims: { issuerLabel: "Demo Hospital Issuer" },
    selectiveClaims: {
      name: "김단유",
      bloodType: "A",
      rhFactor: "+",
    },
    ttlSeconds: 60 * 60 * 24,
  });

  const allergy = signVC({
    issuerPrivateKey: HOSPITAL_ISSUER.privateKey,
    issuerDid: HOSPITAL_ISSUER.did,
    holderDid,
    holderPubKey,
    vct: "https://demo.medicalidentity.kr/allergy/v1",
    publicClaims: { issuerLabel: "Demo Hospital Issuer" },
    selectiveClaims: {
      name: "김단유",
      allergens: ["penicillin"],
      severity: "중증",
      lastUpdated: "2026-03-10",
    },
    ttlSeconds: 60 * 60 * 24,
  });

  cached = { mDL, bloodType, allergy };
  return cached;
}
