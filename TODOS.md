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

**Depends on**: 해커톤 결과 후 다음 단계 결정 (회사화/오픈소스/논문 중 하나).

---
