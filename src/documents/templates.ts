/**
 * 서류 양식 — 기본 4종 + 병원 양식 PDF 자리(시연).
 *
 * 병원마다 양식이 달라서 병원이 자기 양식 PDF를 올릴 수 있어야 한다. 지금은 파일 이름·크기만
 * 자리로 남기고 내용은 저장하지 않는다(기기 저장소에 PDF를 넣지 않음). 칸 지정(환자명·소견·
 * 서명 자리)은 서버가 생긴 뒤 다음 단계다. 기본 양식은 보건복지부 서식을 기준으로 한 시연 양식.
 */
import type { DocKind } from "./store";

export const TEMPLATES_KEY = "medid.hospital.templates";

export interface DocTemplate {
  id: string;
  kind: DocKind;
  name: string;
  source: "default" | "hospital";
  fileName?: string;
  size?: number;
  addedAt?: string;
}

const DEFAULTS: DocTemplate[] = [
  { id: "default-진단서", kind: "진단서", name: "기본 진단서", source: "default" },
  { id: "default-소견서", kind: "소견서", name: "기본 소견서", source: "default" },
  { id: "default-처방전 사본", kind: "처방전 사본", name: "기본 처방전(환자 보관용)", source: "default" },
  { id: "default-진료비 영수증", kind: "진료비 영수증", name: "기본 진료비 영수증", source: "default" },
];

function readHospitalTemplates(): DocTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((t) => t && typeof t.id === "string" && typeof t.kind === "string") : [];
  } catch {
    return [];
  }
}

export function listTemplates(): DocTemplate[] {
  return [...DEFAULTS, ...readHospitalTemplates()];
}

export function addTemplatePlaceholder(input: { kind: DocKind; fileName: string; size: number }): DocTemplate {
  if (!/\.pdf$/i.test(input.fileName)) throw new Error("PDF 파일만 올릴 수 있어요.");
  const t: DocTemplate = {
    id: `tpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    kind: input.kind,
    name: input.fileName.replace(/\.pdf$/i, ""),
    source: "hospital",
    fileName: input.fileName,
    size: input.size,
    addedAt: new Date().toISOString(),
  };
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify([...readHospitalTemplates(), t]));
  return t;
}

export function removeTemplate(id: string) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(readHospitalTemplates().filter((t) => t.id !== id)));
}
