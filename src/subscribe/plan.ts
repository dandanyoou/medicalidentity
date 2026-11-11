/**
 * 가족 프리미엄 구독 — 수익모델.
 *
 * 환급금 자체엔 손대지 않는다(그래서 "환급 100% 당신 것" 차별점 유지). 과금
 * 대상은 '가족 단위 의료 관리'라는 편의 — 면허·공단연동·자금보관 규제 없이
 * 코드로 만들고 실배포 가능한 모델이다.
 *
 * 결제는 토스페이먼츠로 연동하고, 구독 상태는 결제 승인 후 서버에서 내려주는 게
 * 정석이다. 지금은 백엔드/실키 전까지 로컬 상태로 둔다(결제 승인 성공 시 set).
 */

const KEY = "medid.premium.v1";

export interface Plan {
  id: string;
  name: string;
  priceMonthly: number; // 원
  features: string[];
}

export const FAMILY_PREMIUM: Plan = {
  id: "family-premium",
  name: "가족 프리미엄",
  priceMonthly: 3900,
  features: [
    "가족 구성원 무제한 등록",
    "매년 의료비 환급 자동 재확인 · 알림",
    "진료기록 · 처방전 무제한 백업",
    "가족 응급 신원 QR 우선 지원",
  ],
};

export function isPremium(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setPremium(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}

export function clearPremium(): void {
  setPremium(false);
}
