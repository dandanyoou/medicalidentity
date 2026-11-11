/**
 * 문진 답 → (1) 같이 나오면 위험한 조합 경고, (2) 부위 기준 진료과 추천.
 *
 * 규칙 기반이고 검증된 확률이 아니다. 병명을 말하지 않는다 — "바로 확인이 필요한
 * 조합"이라고만 알리고 어디로 가야 하는지(119·응급실·진료과)를 안내한다.
 * 의사 확인 라벨이 쌓이면 실제로 맞았는지 측정해서 고친다.
 */
import { orderedParts, withJosa, type BodyPart, type IntakeAnswers } from "./engine";

export type TriageInput = Pick<
  IntakeAnswers,
  "parts" | "primary" | "severity" | "onset" | "associated" | "triggers"
>;

export interface RedFlag {
  level: "119" | "응급실" | "오늘 진료";
  message: string;
}

const LEVEL_ORDER: RedFlag["level"][] = ["119", "응급실", "오늘 진료"];

export function checkRedFlags(a: TriageInput): RedFlag | null {
  const parts = a.parts ?? [];
  const assoc = a.associated ?? [];
  const has = (p: BodyPart) => parts.includes(p);
  const veryBad = a.severity === 9;
  const found: RedFlag[] = [];

  if (has("가슴") && (assoc.includes("숨이 참") || has("팔·손") || has("목·어깨") || veryBad)) {
    found.push({
      level: "119",
      message:
        "가슴 통증이 숨참, 팔·어깨 통증과 함께 있거나 아주 심하면 바로 확인이 필요해요. 지금 119에 전화하세요.",
    });
  }
  if (has("머리") && assoc.includes("저림·감각 이상")) {
    found.push({
      level: "119",
      message:
        "두통과 함께 저림이나 감각 이상이 있으면 바로 확인이 필요해요. 갑자기 생겼다면 지금 119에 전화하세요.",
    });
  }
  if (has("머리") && has("목·어깨") && assoc.includes("열")) {
    found.push({
      level: "응급실",
      message: "열이 나면서 머리와 목이 함께 아프면 오늘 응급실 진료가 필요해요.",
    });
  }
  if (has("배") && veryBad && assoc.includes("열")) {
    found.push({
      level: "응급실",
      message: "열이 나면서 배가 아주 심하게 아프면 오늘 응급실 진료가 필요해요.",
    });
  }
  if (veryBad && a.onset === "오늘") {
    found.push({
      level: "오늘 진료",
      message: "오늘 갑자기 시작된 아주 심한 통증은 오늘 바로 진료를 받으세요. 견디기 힘들면 응급실로 가세요.",
    });
  }

  if (found.length === 0) return null;
  return found.sort((x, y) => LEVEL_ORDER.indexOf(x.level) - LEVEL_ORDER.indexOf(y.level))[0];
}

const PART_DEPT: Record<BodyPart, string> = {
  머리: "신경과",
  눈: "안과",
  "귀·코·목구멍": "이비인후과",
  "목·어깨": "정형외과",
  가슴: "내과",
  배: "소화기내과",
  "허리·등": "정형외과",
  "팔·손": "정형외과",
  "다리·발": "정형외과",
  피부: "피부과",
  온몸: "내과",
};

const MUSCULOSKELETAL: readonly BodyPart[] = ["목·어깨", "허리·등", "팔·손", "다리·발"];

export interface DeptRecommendation {
  /** 1순위부터. */
  depts: string[];
  reason: string;
}

export function recommendDepts(a: TriageInput): DeptRecommendation | null {
  const parts = orderedParts(a);
  if (parts.length === 0) return null;
  const assoc = a.associated ?? [];
  const numb = assoc.includes("저림·감각 이상");

  if (parts.includes("온몸") && assoc.includes("열")) {
    return { depts: ["내과", "가정의학과"], reason: "온몸이 아프고 열이 있어서 내과·가정의학과를 추천해요." };
  }

  if (parts.every((p) => MUSCULOSKELETAL.includes(p))) {
    return {
      depts: numb ? ["정형외과", "신경과"] : ["정형외과"],
      reason:
        parts.length > 1
          ? `뼈·근육 쪽(${parts.join(", ")})이 함께 아파서 정형외과를 추천해요.${numb ? " 저림이 있어 신경과도 볼 수 있어요." : ""}`
          : `${withJosa(parts[0], "은/는")} 정형외과에서 봐요.${numb ? " 저림이 있어 신경과도 볼 수 있어요." : ""}`,
    };
  }

  if (parts.length === 1) {
    const p = parts[0];
    if (p === "머리") {
      return {
        depts: ["가정의학과", "신경과"],
        reason: "두통은 원인이 다양해서 가정의학과에서 먼저 보고, 필요하면 신경과로 가요.",
      };
    }
    if (p === "배") {
      return { depts: ["소화기내과", "내과"], reason: "배 증상은 소화기내과나 내과에서 봐요." };
    }
    return { depts: [PART_DEPT[p]], reason: `${withJosa(p, "은/는")} ${PART_DEPT[p]}에서 봐요.` };
  }

  // 서로 다른 쪽이 섞임 → 전체를 먼저 보는 과 + 가장 불편한 곳의 전문과.
  const primary = parts[0];
  const second = PART_DEPT[primary];
  return {
    depts: second === "가정의학과" ? ["가정의학과"] : ["가정의학과", second],
    reason: `여러 곳이 함께 아파서, 먼저 전체를 보는 가정의학과를 추천해요. 가장 불편한 ${withJosa(primary, "은/는")} ${second}에서도 볼 수 있어요.`,
  };
}
