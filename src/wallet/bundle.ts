// 환자 VP(presentation) 묶음 생성 — Wallet과 Doctor(데모 버튼) 양쪽에서 쓴다.
//
// 의도적으로 별도 파일로 분리: DoctorScreen이 "데모 데이터로 보기"를 위해
// 이 로직이 필요한데, WalletScreen.tsx에서 바로 가져오면 거기 있는
// `qrcode` 라이브러리까지 DoctorScreen의 번들에 딸려 들어온다(체커 성능
// 작업 때 분리해둔 code-splitting이 깨짐). QR 이미지 렌더링(`buildEmergencyQR`)만
// WalletScreen.tsx에 남겨두고, 순수 VP 생성 로직만 여기로 뺐다.
import type { PatientVCs } from "../data/patient-vcs";
import { DEMO_AUDIENCE, DEMO_HOLDER } from "../data/issuer-keys";
import { presentVP, randomNonce } from "../lib/sdjwt";

export async function buildBundle(vcs: PatientVCs) {
  const nonce = randomNonce();
  const presentArgs = {
    holderPrivateKey: DEMO_HOLDER.privateKey,
    holderDid: DEMO_HOLDER.did,
    audience: DEMO_AUDIENCE,
    nonce,
  };
  const bloodVP = await presentVP({
    vc: vcs.bloodType,
    revealClaimNames: ["bloodType", "rhFactor"],
    ...presentArgs,
  });
  const allergyVP = await presentVP({
    vc: vcs.allergy,
    revealClaimNames: ["allergens", "severity"],
    ...presentArgs,
  });
  const mDLVP = await presentVP({
    vc: vcs.mDL,
    revealClaimNames: [],
    ...presentArgs,
  });
  const controlledSubstanceVP = await presentVP({
    vc: vcs.controlledSubstance,
    revealClaimNames: ["priorVisits"],
    ...presentArgs,
  });
  // Full bundle (paste path) includes mDL identity anchor + 관리약물 이력.
  // QR bundle (scan path) drops both — payload exceeds QR v40 (~2,953 bytes) otherwise.
  const fullCompact = JSON.stringify({
    blood: bloodVP.compact,
    allergy: allergyVP.compact,
    mDL: mDLVP.compact,
    controlledSubstance: controlledSubstanceVP.compact,
    nonce,
  });
  const qrCompact = JSON.stringify({
    blood: bloodVP.compact,
    allergy: allergyVP.compact,
    nonce,
  });
  return { fullCompact, qrCompact };
}

export async function buildVPPayload(vcs: PatientVCs): Promise<string> {
  return (await buildBundle(vcs)).fullCompact;
}
