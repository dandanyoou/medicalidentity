# 결제 연동 (가족 프리미엄 구독)

## 수익모델
- **환급금엔 손대지 않는다.** "환급 수수료 0원, 100% 당신 것"이 차별점이라 유지한다.
- 과금 대상은 **가족 단위 의료 관리라는 편의**: 가족 무제한, 매년 환급 자동 재확인·알림,
  진료기록 무제한 백업. → 면허·공단연동·자금보관 규제 없이 코드로 만들고 실배포 가능.
- 플랜: 가족 프리미엄 **₩3,900/월** (`src/subscribe/plan.ts`).

## 구조
```
[SubscribeScreen] --구독하기--> [토스 결제창] --성공--> /subscribe?status=success&paymentKey&orderId&amount
       |                                                        |
       └── isPaymentConfigured() (VITE_TOSS_CLIENT_KEY 유무)     └── POST /api/confirm (TOSS_SECRET_KEY로 승인)
                                                                        └── 성공 시 프리미엄 활성화
```
- 프론트 결제 요청: `src/subscribe/payment.ts` (토스 SDK, 클라이언트 키).
- 승인(서버): `api/confirm.ts` (Vercel 서버리스, 시크릿 키). 클라이언트에 시크릿 노출 안 함.
- 키가 없으면 가짜 결제를 만들지 않고 "연동 설정 안내"를 보여준다.

## 실배포(라이브) 켜는 법
1. **토스페이먼츠 가입** → 상점 등록 → 클라이언트 키 / 시크릿 키 발급.
2. **Vercel 환경변수** 추가:
   - `VITE_TOSS_CLIENT_KEY` = 클라이언트 키
   - `TOSS_SECRET_KEY` = 시크릿 키 (서버 전용)
3. **재배포** → 구독 화면의 버튼이 실제 토스 결제창으로 바뀌고, 결제 후 `/api/confirm`이 승인.
4. 로컬 테스트: `.env`에 **테스트 키**를 넣고 `npm run dev`. (`.env.example` 참고)

## 남은 것(프로덕션 TODO)
- **자동결제(월 구독)**: 현재는 연동 검증용 단건 결제(`requestPayment`). 정기결제는
  빌링키 발급(`requestBillingAuth`) + 서버에서 매월 승인하는 흐름으로 교체한다.
- **구독 상태의 진짜 출처**: 지금은 승인 성공 시 로컬에 저장. 서버/DB에 구독 상태를 두고
  로그인·기기 간 동기화하도록 바꾼다.
- 영수증·해지·환불 플로우.
