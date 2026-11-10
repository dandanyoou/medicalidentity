/**
 * 병원 체험 신청 — 시연 저장.
 *
 * 서버가 없어 신청은 이 기기 저장소(medid.*)에만 남는다. 실제 영업 흐름(연락·계약)은
 * 서버와 담당자가 생긴 뒤에 붙인다. 화면에 "시연"으로 밝힌다.
 */
export const TRIAL_KEY = "medid.hospital-trial-requests";

/** 요금안. 금액은 가정이다(실제 요금은 파일럿 측정치와 변호사 검토 뒤 정한다). */
export const PLAN = {
  name: "의원 플랜",
  monthlyWon: 49_000,
  trialDays: 14,
  assumed: true,
} as const;

export interface TrialRequest {
  id: string;
  hospital: string;
  contact: string;
  phone: string;
  at: string;
}

export function listTrialRequests(): TrialRequest[] {
  try {
    const raw = localStorage.getItem(TRIAL_KEY);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter(isRequest) : [];
  } catch {
    return [];
  }
}

export function saveTrialRequest(input: { hospital: string; contact: string; phone: string }): TrialRequest {
  const hospital = input.hospital.trim();
  const contact = input.contact.trim();
  const phone = input.phone.trim();
  if (!hospital || !contact || !phone) throw new Error("병원 이름·담당자·연락처가 모두 필요해요.");
  const r: TrialRequest = {
    id: `trial-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    hospital,
    contact,
    phone,
    at: new Date().toISOString(),
  };
  const list = [...listTrialRequests(), r];
  localStorage.setItem(TRIAL_KEY, JSON.stringify(list));
  return r;
}

function isRequest(v: unknown): v is TrialRequest {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.hospital === "string" &&
    typeof o.contact === "string" &&
    typeof o.phone === "string" &&
    typeof o.at === "string"
  );
}
