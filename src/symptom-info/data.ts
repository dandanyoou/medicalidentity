// 증상 참고 정보 — 진단이 아니다.
//
// 법적 경계(2026-10-26 논의, 2026-10-27 확장): 증상에 따라 "이 병원이 좋다"고
// 알고리즘으로 추천하면 의료법상 환자유인알선/무면허 의료행위 경계에 걸릴 수
// 있다. 그래서 이 모듈은 (1) 일반적인 공공보건 수준 참고 정보만 제공하고
// 진단을 내리지 않으며, (2) 병원 추천이 아니라 지도 서비스로 그대로 연결만
// 한다(SymptomInfoScreen.tsx의 openNearbyMap 참고). 의료진 상담을 대체하지 않는다.
//
// 의도적 설계 결정: 환자가 자유 텍스트로 증상을 적으면 그 입력을 LLM에 보내
// "맞춤 진단"을 생성하고 싶은 유혹이 생길 수 있다 — 하지만 그건 지금과는
// 완전히 다른 법적 리스크(무면허 의료행위, 잘못된 정보로 인한 실제 피해)를
// 낳는다. 이 모듈은 의도적으로 "자유 입력 → 사전 작성·검수된 고정 콘텐츠
// 매칭"만 한다. alias 매칭이 안 되면 콘텐츠를 지어내지 않고 정직하게
// "등록된 정보가 없다"고 말한다(SymptomInfoScreen.tsx 참고). 이 경계를
// 넘기려면(LLM 기반으로 바꾸려면) 별도 논의와 설계 문서 개정이 필요하다.

export interface SymptomEntry {
  key: string;
  label: string;
  /** 환자가 실제로 쓸 법한 다른 표현들 — 검색 매칭에 쓰인다. */
  aliases: string[];
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
    aliases: ["머리아픔", "머리통증", "편두통", "머리띵함"],
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
    aliases: ["열", "고열", "미열", "신열"],
    generalInfo:
      "수분을 충분히 섭취하고 휴식을 취하세요. 38.5도 이상이 지속되면 병원에서 진료를 받는 것이 좋습니다.",
    redFlags: ["39도 이상 고열이 하루 이상 지속", "심한 호흡곤란", "의식 저하나 발작"],
    mapQuery: "내과",
  },
  {
    key: "chills",
    label: "오한",
    aliases: ["으슬으슬", "한기", "몸떨림"],
    generalInfo: "보온을 유지하고 체온을 측정해보세요. 발열이 동반되면 내과 진료를 고려하세요.",
    redFlags: ["고열과 함께 의식이 흐려짐", "심한 떨림이 멈추지 않음"],
    mapQuery: "내과",
  },
  {
    key: "cough",
    label: "기침",
    aliases: ["마른기침", "가래기침", "잔기침"],
    generalInfo: "2주 이상 지속되는 기침, 가래에 피가 섞이는 경우 등은 병원 진료가 필요합니다.",
    redFlags: ["호흡곤란", "가슴 통증을 동반한 기침", "피가 섞인 가래"],
    mapQuery: "호흡기내과",
  },
  {
    key: "sputum",
    label: "가래",
    aliases: ["객담", "가래끓음"],
    generalInfo: "가래의 색이 누렇거나 녹색이고 오래 지속되면 병원에서 확인하는 것이 좋습니다.",
    redFlags: ["피가 섞인 가래", "심한 호흡곤란 동반"],
    mapQuery: "호흡기내과",
  },
  {
    key: "sore-throat",
    label: "인후통",
    aliases: ["목아픔", "목따가움", "편도염", "목부음"],
    generalInfo: "따뜻한 물을 자주 마시고 목을 쉬게 하세요. 삼키기 힘들 정도면 병원 진료가 필요합니다.",
    redFlags: ["침을 삼키지 못할 정도의 통증", "호흡곤란", "고열과 심한 목부음 동반"],
    mapQuery: "이비인후과",
  },
  {
    key: "runny-nose",
    label: "콧물",
    aliases: ["비루", "맑은콧물", "누런콧물"],
    generalInfo: "흔한 증상으로 대개 1~2주 내 호전됩니다. 오래 지속되면 이비인후과 진료를 고려하세요.",
    redFlags: ["고열과 함께 극심한 두통"],
    mapQuery: "이비인후과",
  },
  {
    key: "stuffy-nose",
    label: "코막힘",
    aliases: ["비충혈", "코답답함"],
    generalInfo: "실내 습도를 유지하면 도움이 될 수 있습니다. 한쪽만 지속적으로 막히면 진료를 받아보세요.",
    redFlags: ["얼굴 부종과 함께 나타남"],
    mapQuery: "이비인후과",
  },
  {
    key: "sneezing",
    label: "재채기",
    aliases: ["재채기연속"],
    generalInfo: "알레르기성일 수 있습니다. 반복적이고 생활에 지장이 있으면 진료를 고려하세요.",
    redFlags: ["호흡곤란 동반"],
    mapQuery: "이비인후과",
  },
  {
    key: "dyspnea",
    label: "호흡곤란",
    aliases: ["숨참", "숨가쁨", "숨막힘"],
    generalInfo: "호흡이 힘든 증상은 가볍게 넘기지 말고 병원에서 원인을 확인하는 것이 좋습니다.",
    redFlags: ["안정 시에도 숨이 참", "입술이나 손끝이 파랗게 변함", "말을 잇기 힘들 정도의 호흡곤란"],
    mapQuery: "호흡기내과",
  },
  {
    key: "chest-pain",
    label: "흉통",
    aliases: ["가슴통증", "가슴답답함", "가슴조임"],
    generalInfo: "가슴 통증은 원인이 다양합니다. 새로 생긴 통증이면 병원에서 확인하는 것이 안전합니다.",
    redFlags: ["가슴을 쥐어짜는 듯한 통증", "팔·턱으로 퍼지는 통증", "식은땀과 호흡곤란 동반"],
    mapQuery: "순환기내과",
  },
  {
    key: "palpitations",
    label: "두근거림",
    aliases: ["심계항진", "가슴두근거림"],
    generalInfo: "카페인·스트레스로도 나타날 수 있습니다. 반복되면 심장 검사를 받아보는 것이 좋습니다.",
    redFlags: ["가슴 통증과 동반", "실신하거나 어지러워 쓰러질 것 같음"],
    mapQuery: "순환기내과",
  },
  {
    key: "abdominal-pain",
    label: "복통",
    aliases: ["배아픔", "뱃속통증", "배통증"],
    generalInfo: "가벼운 복통은 휴식으로 나아지기도 하지만, 통증이 심하거나 지속되면 병원 진료가 필요합니다.",
    redFlags: ["갑자기 시작된 극심한 복통", "복통과 함께 고열·구토 지속", "복부가 딱딱하게 긴장됨"],
    mapQuery: "외과",
  },
  {
    key: "diarrhea",
    label: "설사",
    aliases: ["묽은변", "무른변"],
    generalInfo: "수분과 전해질 보충이 중요합니다. 3일 이상 지속되면 병원 진료를 받으세요.",
    redFlags: ["혈변", "심한 탈수(소변량 급격히 감소)", "고열 동반"],
    mapQuery: "소화기내과",
  },
  {
    key: "constipation",
    label: "변비",
    aliases: ["배변곤란"],
    generalInfo: "충분한 수분과 섬유질 섭취, 운동이 도움이 됩니다. 1주 이상 지속되면 진료를 고려하세요.",
    redFlags: ["극심한 복통 동반", "구토와 복부팽만 동반"],
    mapQuery: "소화기내과",
  },
  {
    key: "vomiting",
    label: "구토",
    aliases: ["토함", "구토증세"],
    generalInfo: "탈수에 주의하고 소량씩 수분을 섭취하세요. 반복되거나 멈추지 않으면 병원 진료가 필요합니다.",
    redFlags: ["피가 섞인 구토", "심한 탈수", "극심한 두통이나 복통 동반"],
    mapQuery: "소화기내과",
  },
  {
    key: "nausea",
    label: "메스꺼움",
    aliases: ["구역질", "속메스꺼움", "울렁거림"],
    generalInfo: "가벼운 음식과 휴식이 도움이 될 수 있습니다. 지속되면 원인 확인이 필요합니다.",
    redFlags: ["극심한 복통과 동반", "의식 저하 동반"],
    mapQuery: "소화기내과",
  },
  {
    key: "heartburn",
    label: "속쓰림",
    aliases: ["위산역류", "속쓰라림"],
    generalInfo: "자극적인 음식·카페인을 줄이고 식사 후 바로 눕지 않는 것이 도움이 됩니다.",
    redFlags: ["가슴 통증처럼 느껴짐", "삼키기 힘듦이 동반"],
    mapQuery: "소화기내과",
  },
  {
    key: "indigestion",
    label: "소화불량",
    aliases: ["체함", "속더부룩함"],
    generalInfo: "과식을 피하고 소화가 잘 되는 음식을 드세요. 반복되면 진료를 고려하세요.",
    redFlags: ["체중이 갑자기 줄어듦과 동반", "흑색변 동반"],
    mapQuery: "소화기내과",
  },
  {
    key: "bloating",
    label: "복부팽만",
    aliases: ["더부룩함", "배부름"],
    generalInfo: "식습관 조절로 나아지는 경우가 많습니다. 지속되거나 통증이 있으면 진료를 받으세요.",
    redFlags: ["극심한 복통 동반", "구토 동반"],
    mapQuery: "소화기내과",
  },
  {
    key: "dizziness",
    label: "어지러움",
    aliases: ["현기증", "아찔함"],
    generalInfo: "일시적인 어지러움은 흔하지만, 반복되거나 다른 증상과 함께 나타나면 병원에서 원인을 확인하는 것이 좋습니다.",
    redFlags: ["어지러움과 함께 가슴 통증", "한쪽 팔다리 마비나 감각 저하", "심한 두통을 동반한 어지러움"],
    mapQuery: "신경과",
  },
  {
    key: "fatigue",
    label: "피로감",
    aliases: ["무기력", "기운없음"],
    generalInfo: "충분한 수면과 휴식으로 나아지는지 지켜보세요. 몇 주 이상 지속되면 진료를 고려하세요.",
    redFlags: ["체중이 갑자기 줄어듦과 동반", "호흡곤란 동반"],
    mapQuery: "가정의학과",
  },
  {
    key: "insomnia",
    label: "불면",
    aliases: ["수면장애", "잠못잠"],
    generalInfo: "규칙적인 수면 습관과 카페인 줄이기가 도움이 될 수 있습니다. 오래 지속되면 진료를 고려하세요.",
    redFlags: ["극심한 불안이나 우울감 동반"],
    mapQuery: "정신건강의학과",
  },
  {
    key: "back-pain",
    label: "요통",
    aliases: ["허리통증", "허리아픔"],
    generalInfo: "무리한 자세를 피하고 휴식을 취하세요. 다리 저림이 동반되면 병원 진료가 필요합니다.",
    redFlags: ["다리 마비나 감각 저하 동반", "대소변 조절이 어려움"],
    mapQuery: "정형외과",
  },
  {
    key: "joint-pain",
    label: "관절통",
    aliases: ["관절아픔"],
    generalInfo: "휴식과 찜질이 도움이 될 수 있습니다. 부종이나 발열이 동반되면 진료를 받으세요.",
    redFlags: ["관절이 뜨겁고 심하게 부음", "고열 동반"],
    mapQuery: "정형외과",
  },
  {
    key: "muscle-pain",
    label: "근육통",
    aliases: ["근육통증"],
    generalInfo: "충분한 휴식과 스트레칭이 도움이 됩니다. 심하거나 오래가면 진료를 고려하세요.",
    redFlags: ["소변 색이 갈색으로 변함과 동반", "심한 부종 동반"],
    mapQuery: "정형외과",
  },
  {
    key: "shoulder-pain",
    label: "어깨결림",
    aliases: ["어깨통증", "어깨뭉침"],
    generalInfo: "스트레칭과 자세 교정이 도움이 될 수 있습니다. 팔 저림이 동반되면 진료를 받으세요.",
    redFlags: ["팔로 퍼지는 저림·마비", "가슴 통증과 함께 나타남"],
    mapQuery: "정형외과",
  },
  {
    key: "neck-pain",
    label: "목통증",
    aliases: ["목결림", "목뻐근함"],
    generalInfo: "자세 교정과 휴식이 도움이 될 수 있습니다. 팔 저림이 동반되면 진료를 받으세요.",
    redFlags: ["팔 저림·마비 동반", "두통이 심하게 동반"],
    mapQuery: "정형외과",
  },
  {
    key: "numbness",
    label: "손발저림",
    aliases: ["수족저림", "손저림", "발저림"],
    generalInfo: "일시적인 저림은 흔하지만, 반복되거나 한쪽에만 나타나면 진료가 필요합니다.",
    redFlags: ["갑자기 한쪽 팔다리에 힘이 빠짐", "발음이 어눌해짐과 동반"],
    mapQuery: "신경과",
  },
  {
    key: "rash",
    label: "피부발진",
    aliases: ["두드러기", "뾰루지", "발진"],
    generalInfo: "자극 요인을 피하고 경과를 지켜보세요. 빠르게 번지거나 호흡곤란이 있으면 응급 상황입니다.",
    redFlags: ["호흡곤란이나 입술 부종 동반", "온몸으로 빠르게 번짐"],
    mapQuery: "피부과",
  },
  {
    key: "itching",
    label: "가려움",
    aliases: ["소양감", "간지러움"],
    generalInfo: "보습과 자극 요인 회피가 도움이 될 수 있습니다. 지속되면 피부과 진료를 받으세요.",
    redFlags: ["전신으로 번지며 호흡곤란 동반"],
    mapQuery: "피부과",
  },
  {
    key: "edema",
    label: "부종",
    aliases: ["붓기", "부음"],
    generalInfo: "다리를 올리고 휴식을 취해보세요. 갑자기 심해지거나 한쪽만 붓는 경우 진료가 필요합니다.",
    redFlags: ["한쪽 다리만 갑자기 심하게 부음", "호흡곤란 동반"],
    mapQuery: "내과",
  },
  {
    key: "red-eye",
    label: "눈충혈",
    aliases: ["눈빨개짐", "눈핏줄"],
    generalInfo: "눈을 비비지 말고 경과를 지켜보세요. 통증이나 시력 저하가 있으면 안과 진료가 필요합니다.",
    redFlags: ["시력 저하 동반", "심한 눈 통증"],
    mapQuery: "안과",
  },
  {
    key: "itchy-eye",
    label: "눈가려움",
    aliases: ["눈간지러움"],
    generalInfo: "알레르기성일 수 있습니다. 눈을 비비지 마세요. 지속되면 안과 진료를 받으세요.",
    redFlags: ["시력 저하나 심한 통증 동반"],
    mapQuery: "안과",
  },
  {
    key: "ear-pain",
    label: "귀통증",
    aliases: ["귀아픔"],
    generalInfo: "중이염 등이 원인일 수 있습니다. 통증이 심하거나 지속되면 이비인후과 진료가 필요합니다.",
    redFlags: ["고열과 함께 심한 귀통증", "귀에서 분비물이 나옴"],
    mapQuery: "이비인후과",
  },
  {
    key: "tinnitus",
    label: "이명",
    aliases: ["귀울림"],
    generalInfo: "일시적인 이명은 흔하지만, 지속되거나 청력 저하가 동반되면 진료가 필요합니다.",
    redFlags: ["갑작스러운 청력 저하 동반", "어지러움 동반"],
    mapQuery: "이비인후과",
  },
  {
    key: "toothache",
    label: "치통",
    aliases: ["이아픔", "이시림"],
    generalInfo: "찬물·단 음식을 피하고 빠른 시일 내 치과 진료를 받으세요.",
    redFlags: ["얼굴이 심하게 부음", "고열 동반"],
    mapQuery: "치과",
  },
  {
    key: "dry-mouth",
    label: "입마름",
    aliases: ["구강건조"],
    generalInfo: "충분한 수분 섭취가 도움이 됩니다. 지속되면 원인 확인을 위해 진료를 고려하세요.",
    redFlags: ["극심한 갈증과 체중감소 동반"],
    mapQuery: "가정의학과",
  },
  {
    key: "frequent-urination",
    label: "빈뇨",
    aliases: ["소변자주", "소변빈번"],
    generalInfo: "수분 섭취량을 확인해보세요. 지속되거나 통증이 동반되면 진료가 필요합니다.",
    redFlags: ["혈뇨 동반", "고열과 옆구리 통증 동반"],
    mapQuery: "비뇨의학과",
  },
  {
    key: "dysuria",
    label: "배뇨통",
    aliases: ["소변볼때아픔", "소변통증"],
    generalInfo: "수분을 충분히 섭취하세요. 통증이 지속되면 비뇨의학과 진료가 필요합니다.",
    redFlags: ["고열과 옆구리 통증 동반", "혈뇨 동반"],
    mapQuery: "비뇨의학과",
  },
  {
    key: "hematuria",
    label: "혈뇨",
    aliases: ["피오줌", "소변피"],
    generalInfo: "원인 확인을 위해 병원 진료가 필요한 증상입니다.",
    redFlags: ["심한 옆구리·복부 통증 동반", "고열 동반"],
    mapQuery: "비뇨의학과",
  },
  {
    key: "menstrual-pain",
    label: "월경통",
    aliases: ["생리통"],
    generalInfo: "온찜질과 휴식이 도움이 될 수 있습니다. 평소보다 심하거나 일상이 어려우면 진료를 고려하세요.",
    redFlags: ["평소와 다른 극심한 통증", "과다 출혈 동반"],
    mapQuery: "산부인과",
  },
  {
    key: "irregular-period",
    label: "생리불순",
    aliases: ["생리주기이상"],
    generalInfo: "스트레스·체중 변화로도 나타날 수 있습니다. 반복되면 산부인과 진료를 고려하세요.",
    redFlags: ["갑작스러운 과다 출혈"],
    mapQuery: "산부인과",
  },
];

/** 자유 텍스트 입력을 label/alias에 매칭한다 — 지어내지 않고, 없으면 없다고 말한다. */
export function searchSymptoms(query: string): SymptomEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return SYMPTOMS.filter(
    (s) => s.label.toLowerCase().includes(q) || s.aliases.some((a) => a.toLowerCase().includes(q)),
  );
}

export function findSymptom(key: string): SymptomEntry | undefined {
  return SYMPTOMS.find((s) => s.key === key);
}
