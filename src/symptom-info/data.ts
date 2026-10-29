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

/**
 * "허리가 아픈데", "머리도 좀 아프고"처럼 한 문장에 여러 부위가 같이
 * 나오는 경우를 손으로 하나씩 못 따라간다 — 조사(가/도)와 어미(아프/아파/
 * 아픈)의 흔한 조합을 자동으로 만든다. "아프다"는 불규칙 활용이라
 * (아프+아요→아파요, 아프+ㄴ데→아픈데, 'ㅡ' 탈락) 어간 "아프" 하나로는
 * 못 잡는 경우가 많아 세 어미 형태를 각각 따로 둔다. 이래도 모든 조사·
 * 어미 조합을 다 잡진 못한다 — 여전히 고정 문자열 매칭이지 NLP가 아니다.
 */
function painPhrases(bodyPart: string): string[] {
  // "이/가"는 받침 유무로 갈리는데(목이 아파 vs 머리가 아파) 단어마다
  // 맞는 쪽만 골라 넣기보단 둘 다 넣는다 — 안 맞는 쪽("목가")은 실제
  // 문장에 안 나타나니 그냥 안 쓰이고, 맞는 쪽을 빠뜨리는 실수를 막는다.
  const particles = ["이", "가", "도", "는", "는요"];
  // "아프다" 계열 말고도 실제로 아주 흔하게 쓰는 통증 표현들 — "욱신욱신
  // 거리다"(욱신거림), "무거워지다"(묵직함)는 "아프다"와 전혀 다른 어간이라
  // 기존 stems로는 하나도 못 잡았다(사용자 테스트 사례: "다리도 욱신욱신
  // 거리는데", "다리가... 무거워지는데").
  const stems = [
    "아프",
    "아파",
    "아픈",
    "아팠",
    "욱신욱신",
    "욱신거리",
    "욱신거림", // "거리다"(욱신거리고/거리는데)와 명사형 "거림"은 끝 글자가 달라
    // 서로 다른 문자열이다 — 둘 다 넣는다(사용자 테스트 사례).
    "무거워",
    "묵직",
  ];
  // "머리도 좀 아프고"처럼 정도부사가 주어와 서술어 사이에 끼는 건 한국어
  // 문장에서 아주 흔하다 — 빈 문자열(부사 없음)과 자주 쓰는 부사 몇 개를
  // 같이 넣어서 커버한다. 그래도 모든 부사·어순을 다 잡진 못한다.
  const adverbs = ["", "좀 ", "많이 ", "조금 ", "약간 "];
  const withParticles = particles.flatMap((p) =>
    adverbs.flatMap((a) => stems.map((s) => `${bodyPart}${p} ${a}${s}`)),
  );
  // "머리아프고"처럼 조사·띄어쓰기 없이 붙여 쓰는 경우도 실제로 아주
  // 흔하다(빠르게 타이핑할 때) — 띄어쓰기 버전과 별개로 붙여쓰기 버전도
  // 넣는다.
  const fused = stems.map((s) => `${bodyPart}${s}`);
  // "머리 아프고"처럼 띄어쓰기는 있지만 조사를 통째로 빼먹는 경우도 많다
  // (조사 있는 버전·완전 붙여쓰기 버전과는 다른 세 번째 패턴).
  const noParticle = adverbs.flatMap((a) => stems.map((s) => `${bodyPart} ${a}${s}`));
  return [...withParticles, ...fused, ...noParticle];
}

export const SYMPTOMS: readonly SymptomEntry[] = [
  {
    key: "headache",
    label: "두통",
    aliases: ["머리아픔", "머리통증", "편두통", "머리띵함", ...painPhrases("머리")],
    generalInfo:
      "충분한 수분 섭취와 휴식이 도움이 될 수 있습니다. 반복되거나 평소와 다른 두통은 병원에서 상담하세요.",
    redFlags: [
      "갑자기 극심한 두통(평생 처음 겪는 수준)",
      "두통과 함께 발음이 어눌해지거나 팔다리에 힘이 빠짐",
      "의식이 흐려짐",
    ],
    // 2026-10-27: 신경과로 바로 보내던 걸 가정의학과로 바꿈 — 두통은
    // 발열·몸살 등과 함께 오는 경우가 흔한데, 단일 증상이라고 신경과부터
    // 보내면 실제로는 감기 같은 흔한 원인을 놓치고 엉뚱한 과로 보내는
    // 셈이 된다. 표준 진료 순서(1차 진료 먼저, 필요하면 전문과 의뢰)를
    // 따른다 — 증상 조합을 추론해서 바꾸는 게 아니라, 단일 증상 기본값
    // 자체를 더 안전한 쪽으로 고정한 것.
    mapQuery: "가정의학과",
  },
  {
    key: "fever",
    label: "발열",
    aliases: ["열", "고열", "미열", "신열", "열이 나", "열나"],
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
    aliases: ["마른기침", "가래기침", "잔기침", "기침이 나", "콜록"],
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
    aliases: ["목아픔", "목따가움", "편도염", "목부음", ...painPhrases("목")],
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
    aliases: ["가슴통증", "가슴답답함", "가슴조임", "가슴이 답답", "가슴 답답", ...painPhrases("가슴")],
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
    aliases: ["배아픔", "뱃속통증", "배통증", "속이 아프", ...painPhrases("배")],
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
    aliases: ["토함", "구토증세", "토할 것 같", "구토가 나"],
    generalInfo: "탈수에 주의하고 소량씩 수분을 섭취하세요. 반복되거나 멈추지 않으면 병원 진료가 필요합니다.",
    redFlags: ["피가 섞인 구토", "심한 탈수", "극심한 두통이나 복통 동반"],
    mapQuery: "소화기내과",
  },
  {
    key: "nausea",
    label: "메스꺼움",
    aliases: [
      "구역질",
      "속메스꺼움",
      "울렁거림",
      "매쓰거움",
      "매스꺼움",
      "속이 안 좋",
      "속이 안좋", // "안 좋"과 붙여 쓴 "안좋" 둘 다 실제로 쓰인다(사용자 테스트 사례)
      "메스꺼워",
    ],
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
    aliases: ["현기증", "아찔함", "어지러워", "어지럽"],
    generalInfo: "일시적인 어지러움은 흔하지만, 반복되거나 다른 증상과 함께 나타나면 병원에서 원인을 확인하는 것이 좋습니다.",
    redFlags: ["어지러움과 함께 가슴 통증", "한쪽 팔다리 마비나 감각 저하", "심한 두통을 동반한 어지러움"],
    // 2026-10-27: 어지러움도 원인이 귀·심장·신경 등 다양해 신경과로
    // 단정하기보다 가정의학과에서 먼저 보는 게 더 안전한 기본값이다.
    mapQuery: "가정의학과",
  },
  {
    key: "fatigue",
    label: "피로감",
    aliases: ["무기력", "기운없음", "피곤해", "힘이 없"],
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
    aliases: ["허리통증", "허리아픔", ...painPhrases("허리")],
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
    aliases: ["어깨통증", "어깨뭉침", ...painPhrases("어깨")],
    generalInfo: "스트레칭과 자세 교정이 도움이 될 수 있습니다. 팔 저림이 동반되면 진료를 받으세요.",
    redFlags: ["팔로 퍼지는 저림·마비", "가슴 통증과 함께 나타남"],
    mapQuery: "정형외과",
  },
  {
    key: "neck-pain",
    label: "목통증",
    aliases: ["목결림", "목뻐근함", ...painPhrases("목")],
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

  // 2026-10-26 확장: 안과·피부과·정신건강·정형외과·비뇨기과 등 빠져있던
  // 영역을 보강. 데이터 범위를 넓힌다고 해서 특정 병원을 콕 집어 추천하는
  // 기능이 생기는 건 아니다 — 여전히 진료과 안내 + 지도 연결까지만.
  {
    key: "blurred-vision",
    label: "시야흐림",
    aliases: ["눈이 흐려", "시력저하", "침침함"],
    generalInfo: "갑자기 생겼다면 안과 진료가 필요합니다. 천천히 진행됐다면 시력 검사를 받아보세요.",
    redFlags: ["갑자기 한쪽 눈이 안 보임", "두통과 함께 시야가 흐려짐"],
    mapQuery: "안과",
  },
  {
    key: "eye-pain",
    label: "눈통증",
    aliases: [...painPhrases("눈")],
    generalInfo: "렌즈 착용 중이라면 바로 빼세요. 통증이 지속되면 안과 진료가 필요합니다.",
    redFlags: ["시력 저하 동반", "빛을 보기 힘들 정도의 통증"],
    mapQuery: "안과",
  },
  {
    key: "eyelid-twitch",
    label: "눈꺼풀떨림",
    aliases: ["눈떨림"],
    generalInfo: "피로·카페인·마그네슘 부족과 관련 있는 경우가 많습니다. 몇 주 이상 지속되면 진료를 고려하세요.",
    redFlags: ["얼굴 다른 부위까지 떨림이 번짐"],
    // 대부분 피로·카페인 관련 양성 증상이라 신경과보다 가정의학과가
    // 더 부담 없는 첫 진료처다.
    mapQuery: "가정의학과",
  },
  {
    key: "teary-eye",
    label: "눈물흘림",
    aliases: ["눈물이 나"],
    generalInfo: "건조증이나 자극으로도 나타날 수 있습니다. 지속되면 안과 진료를 받으세요.",
    redFlags: ["눈 통증이나 시력 저하 동반"],
    mapQuery: "안과",
  },
  {
    key: "acne",
    label: "여드름",
    aliases: ["뾰루지", "여드름이 나"],
    generalInfo: "피부를 깨끗이 유지하고 자극을 피하세요. 심하거나 흉터가 걱정되면 피부과 진료를 고려하세요.",
    redFlags: ["갑자기 전신에 번짐", "고열 동반"],
    mapQuery: "피부과",
  },
  {
    key: "dry-skin",
    label: "피부건조",
    aliases: ["피부가 건조", "각질"],
    generalInfo: "보습제를 충분히 바르고 뜨거운 물 샤워를 줄여보세요. 갈라지거나 가려움이 심하면 진료를 받으세요.",
    redFlags: ["피부가 갈라져 출혈", "전신으로 번지는 가려움"],
    mapQuery: "피부과",
  },
  {
    key: "hair-loss",
    label: "탈모",
    aliases: ["머리카락 빠짐", "머리가 빠지"],
    generalInfo: "스트레스·영양 상태와도 관련 있습니다. 갑자기 심해지면 피부과 진료를 고려하세요.",
    redFlags: ["원형으로 급격히 빠짐", "두피 염증 동반"],
    mapQuery: "피부과",
  },
  {
    key: "bruise",
    label: "멍",
    aliases: ["멍이 들", "타박상"],
    generalInfo: "가벼운 멍은 시간이 지나면 가라앉습니다. 원인 없이 자주 생기면 진료를 고려하세요.",
    redFlags: ["원인 없이 온몸에 멍이 자주 생김", "잇몸·코피 등 다른 출혈 동반"],
    mapQuery: "내과",
  },
  {
    key: "burn",
    label: "화상",
    aliases: ["데었어", "화상입었어"],
    generalInfo: "흐르는 찬물로 식히고 물집을 터뜨리지 마세요. 넓거나 깊으면 바로 병원에 가야 합니다.",
    redFlags: ["손바닥 크기보다 넓은 화상", "얼굴·기도 화상", "물집이 크고 깊음"],
    mapQuery: "응급실",
  },
  {
    key: "insect-bite",
    label: "벌레물림",
    aliases: ["벌레에 물렸", "벌쏘임"],
    generalInfo: "가렵고 붓는 정도면 냉찜질로 가라앉는 경우가 많습니다. 전신 반응이 있으면 응급 상황입니다.",
    redFlags: ["호흡곤란이나 얼굴 부종(아나필락시스 의심)", "물린 부위가 빠르게 넓게 번짐"],
    mapQuery: "응급실",
  },
  {
    key: "hiccup",
    label: "딸꾹질",
    aliases: ["딸국질"],
    generalInfo: "대부분 저절로 멈춥니다. 48시간 이상 지속되면 진료를 고려하세요.",
    redFlags: ["48시간 이상 멈추지 않음", "가슴 통증 동반"],
    mapQuery: "내과",
  },
  {
    key: "nosebleed",
    label: "코피",
    aliases: ["코피가 나"],
    generalInfo: "고개를 숙이고 콧날개를 10분 정도 눌러주세요. 15분 이상 안 멈추면 병원에 가야 합니다.",
    redFlags: ["15분 이상 지혈 안 됨", "외상 후 발생한 코피"],
    mapQuery: "이비인후과",
  },
  {
    key: "cold-hands-feet",
    label: "손발차가움",
    aliases: ["손발이 차", "수족냉증"],
    generalInfo: "혈액순환과 관련 있는 경우가 많습니다. 색이 변하거나 저림이 동반되면 진료를 고려하세요.",
    redFlags: ["손발 색이 하얗거나 파랗게 변함", "감각이 사라짐"],
    mapQuery: "내과",
  },
  {
    key: "hiccup-burp",
    label: "트림",
    aliases: ["트림이 나"],
    generalInfo: "흔한 소화 증상입니다. 가슴 통증이나 삼키기 힘듦이 동반되면 진료를 받으세요.",
    redFlags: ["가슴 통증 동반", "삼키기 힘듦 동반"],
    mapQuery: "소화기내과",
  },
  {
    key: "jaundice",
    label: "황달",
    aliases: ["눈이 노래", "피부가 노래짐"],
    generalInfo: "눈 흰자나 피부가 노랗게 보이면 원인 확인이 필요한 증상입니다. 병원 진료를 받으세요.",
    redFlags: ["극심한 복통 동반", "소변 색이 진해짐과 동반"],
    mapQuery: "소화기내과",
  },
  {
    key: "hemorrhoid",
    label: "치질",
    aliases: ["치핵", "항문통증"],
    generalInfo: "좌욕과 섬유질 섭취가 도움이 될 수 있습니다. 출혈이 지속되면 진료를 받으세요.",
    redFlags: ["다량의 출혈", "극심한 통증으로 앉기 힘듦"],
    mapQuery: "외과",
  },
  {
    key: "anxiety",
    label: "불안",
    aliases: ["불안해", "초조함"],
    generalInfo: "일시적인 불안은 흔합니다. 일상생활이 어려울 정도로 지속되면 상담을 받아보세요.",
    redFlags: ["극심한 불안과 함께 가슴 통증·호흡곤란", "자해·자살 생각"],
    mapQuery: "정신건강의학과",
  },
  {
    key: "depression",
    label: "우울감",
    aliases: ["우울해", "기분이 가라앉"],
    generalInfo: "2주 이상 지속되면 혼자 견디지 말고 상담을 받아보는 것이 좋습니다.",
    redFlags: ["자해·자살 생각", "일상생활이 전혀 불가능함"],
    mapQuery: "정신건강의학과",
  },
  {
    key: "panic",
    label: "공황",
    aliases: ["공황발작", "숨이 막히고 불안"],
    generalInfo: "갑작스러운 극심한 불안·심장 두근거림·호흡곤란이 동시에 오는 경우입니다. 반복되면 진료가 필요합니다.",
    redFlags: ["가슴 통증이 동반돼 심장 문제와 구별이 안 될 때(응급 확인 우선)"],
    mapQuery: "정신건강의학과",
  },
  {
    key: "poor-concentration",
    label: "집중력저하",
    aliases: ["집중이 안 돼", "멍해짐"],
    generalInfo: "수면 부족·스트레스와 관련 있는 경우가 많습니다. 지속되면 원인 확인을 위해 진료를 고려하세요.",
    redFlags: ["갑자기 심해지며 의식 저하 동반"],
    // 수면·스트레스 등 원인이 다양해 가정의학과에서 먼저 보는 게 맞다.
    mapQuery: "가정의학과",
  },
  {
    key: "memory-loss",
    label: "건망증",
    aliases: ["기억력저하", "자꾸 깜빡"],
    generalInfo: "일시적인 건망증은 흔합니다. 일상생활에 지장을 줄 정도로 심해지면 진료를 고려하세요.",
    redFlags: ["갑작스럽고 급격한 기억력 저하", "길을 잃거나 사람을 못 알아봄"],
    mapQuery: "가정의학과",
  },
  {
    key: "knee-pain",
    label: "무릎통증",
    aliases: [...painPhrases("무릎")],
    generalInfo: "휴식과 찜질이 도움이 될 수 있습니다. 붓거나 움직이기 힘들면 진료를 받으세요.",
    redFlags: ["갑자기 심하게 부음", "체중을 싣지 못할 정도의 통증"],
    mapQuery: "정형외과",
  },
  {
    key: "ankle-pain",
    label: "발목통증",
    aliases: ["발목삠", ...painPhrases("발목")],
    generalInfo: "RICE(휴식·냉찜질·압박·거상)가 도움이 됩니다. 심하게 붓거나 체중을 못 실으면 진료를 받으세요.",
    redFlags: ["기형적으로 변형됨", "체중을 전혀 실을 수 없음"],
    mapQuery: "정형외과",
  },
  {
    key: "leg-pain",
    label: "다리통증",
    aliases: ["다리아픔", ...painPhrases("다리")],
    generalInfo:
      "근육통이나 가벼운 피로로도 흔히 생깁니다. 한쪽만 붓거나 색이 변하면 혈관 문제일 수 있어 바로 진료가 필요합니다.",
    redFlags: [
      "한쪽 다리만 갑자기 붓고 색이 변함(혈관 문제 의심)",
      "다리에 힘이 빠지거나 감각이 사라짐",
      "걷기 힘들 정도의 급격한 통증",
    ],
    mapQuery: "정형외과",
  },
  {
    key: "wrist-pain",
    label: "손목통증",
    aliases: [...painPhrases("손목")],
    generalInfo: "반복적인 손 사용과 관련 있는 경우가 많습니다. 저림이 동반되면 진료를 고려하세요.",
    redFlags: ["저림·감각저하 동반", "외상 후 변형됨"],
    mapQuery: "정형외과",
  },
  {
    key: "sciatica",
    label: "좌골신경통",
    aliases: ["다리가 저리고 허리", "엉덩이부터 다리저림"],
    generalInfo: "허리에서 다리로 뻗치는 저림·통증입니다. 지속되면 정형외과나 신경외과 진료가 필요합니다.",
    redFlags: ["다리에 힘이 빠짐", "대소변 조절이 어려움"],
    mapQuery: "정형외과",
  },
  {
    key: "muscle-cramp",
    label: "쥐남",
    aliases: ["쥐가 나", "근육경련"],
    generalInfo: "수분·전해질 부족과 관련 있는 경우가 많습니다. 자주 반복되면 진료를 고려하세요.",
    redFlags: ["전신 경련으로 번짐", "의식 저하 동반"],
    // 전해질·수분 부족이 흔한 원인이라 신경과보다 가정의학과·내과가
    // 더 적절한 첫 진료처다.
    mapQuery: "가정의학과",
  },
  {
    key: "seizure",
    label: "경련",
    aliases: ["발작", "몸이 떨리고 의식이"],
    generalInfo: "처음 겪는 경련은 반드시 응급 진료가 필요한 증상입니다.",
    redFlags: ["의식을 잃음", "5분 이상 지속되는 경련", "호흡곤란 동반"],
    mapQuery: "응급실",
  },
  {
    key: "fainting",
    label: "실신",
    aliases: ["정신을 잃었", "쓰러졌"],
    generalInfo: "짧게 의식을 잃었다 돌아왔더라도 원인 확인을 위해 병원 진료가 필요합니다.",
    redFlags: ["가슴 통증과 함께 실신", "의식이 바로 돌아오지 않음"],
    mapQuery: "응급실",
  },
  {
    key: "hoarse-voice",
    label: "쉰목소리",
    aliases: ["목소리가 쉬", "음성변화"],
    generalInfo: "과도한 사용이나 감기로 흔히 생깁니다. 2주 이상 지속되면 이비인후과 진료를 받으세요.",
    redFlags: ["삼키기 힘듦 동반", "호흡곤란 동반"],
    mapQuery: "이비인후과",
  },
  {
    key: "sinusitis",
    label: "축농증",
    aliases: ["부비동염", "코가 막히고 누런콧물"],
    generalInfo: "따뜻한 증기 흡입이 도움이 될 수 있습니다. 2주 이상 지속되면 이비인후과 진료를 받으세요.",
    redFlags: ["눈 주위가 심하게 부음", "고열과 심한 두통 동반"],
    mapQuery: "이비인후과",
  },
  {
    key: "gum-bleeding",
    label: "잇몸출혈",
    aliases: ["잇몸에서 피", "잇몸이 붓고 피"],
    generalInfo: "칫솔질 습관과 관련 있는 경우가 많습니다. 반복되면 치과 진료를 받으세요.",
    redFlags: ["멈추지 않는 다량의 출혈", "얼굴이 심하게 부음"],
    mapQuery: "치과",
  },
  {
    key: "weight-loss",
    label: "체중감소",
    aliases: ["살이 빠져", "급격한 체중감소"],
    generalInfo: "의도치 않게 체중이 줄었다면 원인 확인을 위해 병원 진료가 필요합니다.",
    redFlags: ["단기간에 급격한 체중감소", "식욕부진과 피로감 동반"],
    mapQuery: "가정의학과",
  },
  {
    key: "loss-of-appetite",
    label: "식욕부진",
    aliases: ["입맛이 없", "밥맛이 없"],
    generalInfo: "일시적인 경우가 많습니다. 2주 이상 지속되거나 체중감소가 동반되면 진료를 고려하세요.",
    redFlags: ["체중감소와 함께 지속됨", "복통이나 황달 동반"],
    mapQuery: "소화기내과",
  },
  {
    key: "night-sweat",
    label: "야간발한",
    aliases: ["밤에 땀이 많이", "식은땀"],
    generalInfo: "폐경기나 감염 등 다양한 원인이 있습니다. 반복되면 진료를 고려하세요.",
    redFlags: ["체중감소·고열과 함께 지속됨"],
    mapQuery: "내과",
  },
  {
    key: "frequent-thirst",
    label: "갈증",
    aliases: ["목이 자꾸 말라", "물을 많이 마셔"],
    generalInfo: "탈수 외에 당뇨 등 다른 원인도 있을 수 있습니다. 체중감소·빈뇨가 동반되면 진료를 고려하세요.",
    redFlags: ["체중감소·빈뇨와 함께 나타남", "의식 저하 동반"],
    mapQuery: "내과",
  },
  {
    key: "swollen-lymph",
    label: "림프절부음",
    aliases: ["목에 멍울", "임파선이 부어"],
    generalInfo: "감염으로 흔히 생기고 저절로 가라앉는 경우가 많습니다. 2주 이상 지속되면 진료를 받으세요.",
    redFlags: ["빠르게 커짐", "딱딱하고 통증이 없는 멍울"],
    mapQuery: "내과",
  },
  {
    key: "vaginal-discharge",
    label: "냉대하",
    aliases: ["냉이 많아", "분비물이 이상해"],
    generalInfo: "분비물의 색·냄새가 평소와 다르면 산부인과 진료를 받아보는 것이 좋습니다.",
    redFlags: ["복통·고열 동반", "출혈 동반"],
    mapQuery: "산부인과",
  },
  {
    key: "erectile-dysfunction",
    label: "발기부전",
    aliases: ["발기가 안 돼"],
    generalInfo: "스트레스·혈관 건강과 관련 있는 경우가 많습니다. 지속되면 비뇨의학과 진료를 고려하세요.",
    redFlags: ["가슴 통증 등 심혈관 증상 동반"],
    mapQuery: "비뇨의학과",
  },
  {
    key: "insomnia-excessive",
    label: "과다수면",
    aliases: ["잠이 너무 많", "계속 졸려"],
    generalInfo: "수면의 질 저하나 다른 건강 문제와 관련 있을 수 있습니다. 지속되면 진료를 고려하세요.",
    redFlags: ["의식 저하와 구별이 안 되는 심한 졸림"],
    mapQuery: "정신건강의학과",
  },
];

/**
 * 자유 텍스트(문장 포함)를 label/alias에 매칭한다 — 지어내지 않고, 없으면
 * 없다고 말한다. LLM이 문장을 "해석"하지 않는다: 단순 부분 문자열 일치라서
 * 한국어 활용형(예: "아파요"의 어간 변화)을 전부 잡아내진 못한다. 자주
 * 쓰이는 활용형은 alias에 조각으로 미리 추가해뒀다(예: "머리가 아프").
 *
 * 양방향으로 본다: (1) 문장 안에 등록된 단어가 들어있는 경우(자연어 입력,
 * 예: "어제부터 머리가 아파요" 안의 "머리가 아프") — 우선순위 높음.
 * (2) 입력이 등록된 단어의 앞부분인 경우(한 글자씩 타이핑 중, 자동완성).
 */
export function searchSymptoms(query: string): SymptomEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const contains: SymptomEntry[] = [];
  const prefixOf: SymptomEntry[] = [];

  for (const s of SYMPTOMS) {
    const terms = [s.label, ...s.aliases].map((t) => t.toLowerCase());
    if (terms.some((t) => t.length >= 2 && q.includes(t))) {
      contains.push(s);
    } else if (s.label.toLowerCase().includes(q)) {
      // 역방향(prefixOf) 매칭은 "아직 타이핑 중"인 짧은 입력을 위한
      // 것이다(예: "두" → "두통"). alias까지 포함해서 역방향으로 돌리면
      // 문제가 생긴다 — painPhrases()가 만든 "다리가 욱신욱신" 같은 긴
      // 조합 문구 안에는 "욱신욱신"이 글자 그대로 들어있어서, 몸 부위 없이
      // 그 어간만 짧게 치면(예: "욱신거리", "무거워") 그 어간을 쓰는
      // 10개 부위 전부가 동시에 걸려버린다(사용자 테스트 사례). label은
      // 짧고 고유해서 이 문제가 없다 — 역방향 매칭은 label로만 제한한다.
      prefixOf.push(s);
    }
  }

  return [...contains, ...prefixOf];
}

export function findSymptom(key: string): SymptomEntry | undefined {
  return SYMPTOMS.find((s) => s.key === key);
}
