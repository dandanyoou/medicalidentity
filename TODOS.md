# TODOS

해커톤 데모 범위 밖이지만 향후 가치 있는 항목들. 본 데모 종료 후 결정.

## [TODO-1] 의식없음 역방향 호출을 실제 구현으로 승격

**What**: D8에서 아키텍처 슬라이드로 다운그레이드한 "환자 의식없을 때 의사가 wallet 역방향 호출 → 자동 응답" 흐름을, 실제 동작하는 NFC/BLE transport 위에 구현.

**Why**: 본 데모의 30초 시연은 QR 단방향에 집중. 그러나 응급의 본질(환자 능동 동작 불가)을 정직하게 푸는 흐름은 역방향 호출이며, 해커톤 이후 프로덕트로 진행 시 OmniOne 계열 DID 데모 중 고유한 가치 포인트.

**Pros**:
- 큐·1·논문·후속 발표 강한 차별점
- "선택적 공개 + 사전 동의 정책 자동 실행" — W3C VC 표준의 진짜 실제적 활용
- 한국 응급 의료 실제 워크플로우와 정합

**Cons**:
- Web NFC API는 Chrome Android만 지원, iOS Safari 없음
- BLE는 OS·디바이스·권한 복잡, 엄청난 dive
- 인증서 트러스트 체인, 의사 verifier role VC 발급 인프라 필요
- 1-2주 구현 + 데모 디바이스 마련 필요

**Context** (3개월 후에 본인이 다시 찾을 수 있게):
- 본 데모는 `~/.gstack/projects/dandanyoou-medicalidentity/test-main-design-20260514-192916.md` 의 아키텍처 슬라이드에 다이어그램만 묘사
- `auth-policy` VC (환자 self-issued), `doctor verifier role VC` (병원 issuer 서명) 두 개념이 핵심
- D8 결정 사유: 30초 데모 압축 + 12시간 LockScreen UX 디자인 부담 + iframe 시뮬레이션이 실제 다른 디바이스 통신 아님

**진행 상황 (2026-09-30 eng-review, D1-D5)**:
- Policy 매칭 + role VC 검증(서명·신뢰앵커·jti 폐기·nonce) 순수 로직은 `src/emergency-call/index.ts` + 4개 테스트로 **구현·검증 완료**. `verifyVP`/`REVOKED_CREDENTIAL_IDS` 그대로 재사용 — role VC 도난 시 개별 폐기 가능함을 테스트로 증명.
- **UI·전송 계층(iframe+postMessage 시뮬레이션 포함)은 의도적으로 안 만듦.** 환자폰이 아이폰이라 Web NFC(NDEFReader)·Web Bluetooth 둘 다 Safari에 API 자체가 없어 실제 무선은 원천 불가능. Same-tab iframe 시뮬레이션은 D8이 이미 한 번 "실제 다른 기기 통신이 아니다"로 반려한 것과 동일한 문제라 outside voice 검토에서 재반려됨.
- **새로 발견된 위험 (outside voice)**: "지금 postMessage로 만들고 나중에 진짜 NFC/BLE로 바꾸면 된다"는 가정 자체가 틀렸을 가능성 높음 — iOS는 잠금·백그라운드 상태의 PWA가 지속 리스너를 못 돌림. 실제 구현은 네이티브 앱(CoreNFC 등)이 필요해 **아키텍처가 통째로 다를 수 있음**. "오늘 코드가 나중에 재사용될 뼈대"라는 전제를 검증 없이 깔면 안 됨.
- 아래 "Depends on"의 "해커톤 이후 결정" 게이트는 여전히 안 넘음 — 실제 전송 계층 착수 전에 재확인 필요.

**Depends on**: 해커톤 결과 후 다음 단계 결정 (회사화/오픈소스/논문 중 하나). 전송 계층(NFC/BLE) 착수 전 네이티브 앱 전환 여부부터 별도 결정 필요 (웹 PWA로는 iOS에서 구조적으로 불가능할 수 있음).

---

## [TODO-2] 검증자(의사) 측 nonce challenge-response 재설계

**What**: `/plan-eng-review`(2026-09-30)에서 1주일 스프린트 범위 산정 중 컷된 항목. `src/wallet/WalletScreen.tsx`가 `randomNonce()`로 자체 nonce를 생성하는 현재 구조(`src/lib/sdjwt.ts:274-278`)를, 검증자(의사)가 먼저 challenge QR을 발급하고 wallet이 그걸 스캔해 응답하는 양방향 구조로 바꾸는 작업.

**Why**: 현재 구조는 QR replay 공격에 취약 (`docs/designs/ibel-3month-plan-compression.md` 전제 #2 참고). 하지만 이 fix 자체가 wallet에 QR 스캔 기능(현재 없음 — `WalletScreen.tsx`는 표시만 하고 `Html5Qrcode`는 `DoctorScreen.tsx`에만 있음)을 요구하며, 환자가 의식 없는 응급 상황에서 환자 디바이스가 능동적으로 스캔해야 하는 구조는 이 제품의 존재 이유(응급 상황 지원)와 충돌한다는 게 outside voice 리뷰에서 지적됨.

**Pros**:
- 어제 승인된 연구 design doc(1개월+2개월 압축안)의 Month-1 범위와 일치 — 연구 트랙에서는 계속 필요
- QR replay 공격 실제 차단

**Cons**:
- worst-case 10 영업일 — 1주일 스프린트 전체를 이 항목 하나로 다 쓸 수 있음
- 응급 시나리오(환자 의식 없음)와 설계상 충돌 — 대안 메커니즘(NFC/BLE 등) 필요할 수 있음, TODO-1과 연관
- wallet 측에 신규 스캔 UI·카메라 권한 추가 필요

**Context** (3개월 후에 본인이 다시 찾을 수 있게):
- `/plan-eng-review` 2026-09-30 세션에서 D7로 컷 결정. 1주일 스프린트는 wallet측 nonce를 유지하되 한계를 명시(`src/lib/sdjwt.ts` 주석 또는 슬라이드 1줄)하는 걸로 대체.
- 두 차례 독립 리뷰(office-hours 세션 second opinion + 이번 plan-eng-review outside voice)가 모두 이 항목을 "가장 위험한 단일 항목"으로 지목.

**Depends on**: TODO-1(역방향 호출)과 함께 검토 — NFC/BLE 기반 접근이 QR 재스캔보다 응급 시나리오에 더 잘 맞을 수 있음.

---
