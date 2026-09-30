// 응급 호출(역방향 호출) — 환자가 의식 없을 때 의사 디바이스가 자신의
// verifier role VC를 제시하면, 환자의 사전 서명된 authorization policy VC와
// 매칭해 자동으로 선택적 공개 범위를 정하는 순수 로직.
//
// 범위 (eng-review 2026-09-30, D1-D5 — outside voice 반영):
//   - 이 파일은 정책 매칭·role VC 검증·폐기 체크만 다룬다. UI·iframe·postMessage
//     전송 계층은 의도적으로 빼둠 — 환자폰이 아이폰이라 Web NFC/BLE 자체가
//     불가능하고, 같은 탭 안 iframe 시뮬레이션은 "실제 다른 기기 간 통신이
//     아니다"라는, 이미 5월에 이 기능을 슬라이드로 다운그레이드했던 이유를
//     그대로 재현할 뿐이라 outside voice 검토에서 반려됨.
//   - 여기 있는 policy 매칭 + role VC 검증 + jti 폐기는 실제 전송 수단이
//     무엇이든(NFC/BLE/QR/postMessage) 재사용 가능한 핵심 로직이다.
//   - 실제 전송 계층(NFC/BLE)은 TODOS.md TODO-1 그대로 미착수 — "해커톤 이후
//     제품화 결정 시" 게이트도 아직 통과 안 됨.

import { presentVP, verifyVP, VerifyError, type SignedVC } from "../lib/sdjwt";

export interface AuthorizationPolicy {
  /** 이 role을 가진 verifier에게 자동 응답을 허용 */
  allow: string[];
  /** 허용된 verifier에게 공개할 클레임 이름 */
  disclose: string[];
}

export interface PresentRoleVCParams {
  roleVC: SignedVC;
  doctorPrivateKey: Uint8Array;
  doctorDid: string;
  audience: string;
  nonce: string;
}

/** 의사 디바이스가 자신의 role VC를 제시 — mDL과 동일하게 0-disclosure +
 * KB-JWT 홀더 바인딩만으로 신원(역할) anchor 역할을 한다. */
export function presentRoleVC(p: PresentRoleVCParams) {
  return presentVP({
    vc: p.roleVC,
    revealClaimNames: [], // role/hospital/validUntil은 이미 publicClaims라 disclosure 불필요
    holderPrivateKey: p.doctorPrivateKey,
    holderDid: p.doctorDid,
    audience: p.audience,
    nonce: p.nonce,
  });
}

export interface MatchPolicyParams {
  presentedRoleVC: string; // presentRoleVC()의 compact 결과
  trustAnchors: Record<string, Uint8Array>;
  revokedCredentialIds: ReadonlySet<string>;
  expectedAudience: string;
  expectedNonce: string;
  policy: AuthorizationPolicy;
}

export interface MatchPolicyResult {
  matched: boolean;
  disclose: string[]; // matched=false면 항상 []
  reason: string; // 사람이 읽을 수 있는 판정 사유 (성공/실패 둘 다)
}

/**
 * role VC를 검증(서명·신뢰앵커·폐기·감사·nonce 전부 포함, sdjwt.ts 재사용)한 뒤
 * 그 role이 patient의 authorization policy.allow에 있으면 disclose 목록을 반환.
 * 검증 실패(변조/미신뢰 발급자/폐기/만료/nonce 불일치)는 전부 matched=false로
 * 귀결 — 어느 이유든 자동 응답을 안 하는 게 맞다.
 */
export async function verifyAndMatchPolicy(
  p: MatchPolicyParams,
): Promise<MatchPolicyResult> {
  let result;
  try {
    result = await verifyVP({
      vp: p.presentedRoleVC,
      trustAnchors: p.trustAnchors,
      revokedCredentialIds: p.revokedCredentialIds,
      expectedAudience: p.expectedAudience,
      expectedNonce: p.expectedNonce,
    });
  } catch (e) {
    const reason = e instanceof VerifyError ? e.reason : (e as Error).message;
    return { matched: false, disclose: [], reason: `role VC 검증 실패: ${reason}` };
  }

  const role = result.revealedClaims.role;
  if (typeof role !== "string" || !p.policy.allow.includes(role)) {
    return {
      matched: false,
      disclose: [],
      reason: `role "${String(role)}"은 policy.allow에 없음`,
    };
  }

  return {
    matched: true,
    disclose: p.policy.disclose,
    reason: `role "${role}" 매칭됨 — ${p.policy.disclose.join(", ")} 공개 허용`,
  };
}
