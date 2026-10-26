// 증상 참고 정보 — 진단이 아니다.
//
// 법적 경계(2026-10-26 논의): 증상에 따라 "이 병원이 좋다"고 알고리즘으로
// 추천하면 의료법상 환자유인알선/무면허 의료행위 경계에 걸릴 수 있다. 그래서
// 이 모듈은 (1) 일반적인 공공보건 수준 참고 정보만 제공하고 진단을 내리지
// 않으며, (2) 병원 추천이 아니라 지도 서비스로 그대로 연결만 한다
// (SymptomInfoScreen.tsx의 openNearbyMap 참고). 의료진 상담을 대체하지 않는다.

export interface SymptomEntry {
  key: string;
  label: string;
  /** 일반적인 공공보건 수준 참고 정보. 특정 진단·처방을 내리지 않는다. */
  generalInfo: string;
  /** 이 중 하나라도 해당하면 자가 참고 대신 즉시 응급실/119로 안내. */
  redFlags: string[];
  mapQuery: string;
}

export const SYMPTOMS: readonly SymptomEntry[] = [
  {
    key: "headache",
    label: "두통",
    generalInfo:
      "충분한 수분 섭취와 휴식이 도움이 될 수 있습니다. 반복되거나 평소와 다른 두통은 병원에서 상담하세요.",
    redFlags: [
      "갑자기 극심한 두통(평생 처음 겪는 수준)",
      "두통과 함께 발음이 어눌해지거나 팔다리에 힘이 빠짐",
      "의식이 흐려짐",
    ],
    mapQuery: "신경과",
  },
  {
    key: "fever",
    label: "발열",
    generalInfo:
      "수분을 충분히 섭취하고 휴식을 취하세요. 38.5도 이상이 지속되면 병원에서 진료를 받는 것이 좋습니다.",
    redFlags: [
      "39도 이상 고열이 하루 이상 지속",
      "심한 호흡곤란",
      "의식 저하나 발작",
    ],
    mapQuery: "내과",
  },
  {
    key: "cough",
    label: "기침",
    generalInfo:
      "2주 이상 지속되는 기침, 가래에 피가 섞이는 경우 등은 병원 진료가 필요합니다.",
    redFlags: ["호흡곤란", "가슴 통증을 동반한 기침", "피가 섞인 가래"],
    mapQuery: "호흡기내과",
  },
  {
    key: "abdominal-pain",
    label: "복통",
    generalInfo:
      "가벼운 복통은 휴식으로 나아지기도 하지만, 통증이 심하거나 지속되면 병원 진료가 필요합니다.",
    redFlags: [
      "갑자기 시작된 극심한 복통",
      "복통과 함께 고열·구토 지속",
      "복부가 딱딱하게 긴장됨",
    ],
    mapQuery: "외과",
  },
  {
    key: "dizziness",
    label: "어지러움",
    generalInfo:
      "일시적인 어지러움은 흔하지만, 반복되거나 다른 증상과 함께 나타나면 병원에서 원인을 확인하는 것이 좋습니다.",
    redFlags: [
      "어지러움과 함께 가슴 통증",
      "한쪽 팔다리 마비나 감각 저하",
      "심한 두통을 동반한 어지러움",
    ],
    mapQuery: "신경과",
  },
];

export function findSymptom(key: string): SymptomEntry | undefined {
  return SYMPTOMS.find((s) => s.key === key);
}
