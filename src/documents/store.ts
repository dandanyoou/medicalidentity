/**
 * 병원이 환자 지갑에 넣어주는 서류 — 시연 저장소.
 *
 * 설계(docs/designs/hospital-documents.md): 우리는 서류를 만들거나 고치지 않는 배달 통로다.
 * 병원(직원 배지로 로그인한 사람)이 진료를 마친 방문의 소견·처방·진료비로 서류를 만들고
 * 병원 키로 서명해 환자에게 보낸다. 환자가 받으면 중계 사본은 지우고, 7일 안에 안 받으면
 * 폐기한다. 진단서·소견서는 의사 역할만 발급한다(의료법 17조 해석 — 변호사 확인).
 *
 * 시연의 한계: 서버가 없어 "중계"가 같은 기기 저장소다. 처방전은 환자 보관용 사본만 다루고
 * 약국 전송은 하지 않는다. 주민번호·서류 원본(스캔)은 저장하지 않는다.
 */
import type { Prescription, Visit } from "../visits/store";
import { getMember } from "../family/store";
import { getHospital, signWithHospital, verifyWithHospital, type Role, type Session } from "../hospital/badge";
import { getFees } from "./fees";

export const DOCS_KEY = "medid.documents";
export const RELAY_DAYS = 7;
const DAY = 86_400_000;

export type DocKind = "진단서" | "소견서" | "처방전 사본" | "진료비 영수증";

export const DOC_KINDS: { kind: DocKind; doctorOnly: boolean; desc: string }[] = [
  { kind: "진단서", doctorOnly: true, desc: "직접 진찰한 의사만 작성·서명" },
  { kind: "소견서", doctorOnly: true, desc: "의사 소견, 다른 병원·보험 제출용" },
  { kind: "처방전 사본", doctorOnly: false, desc: "환자 보관용 사본 — 약국 전송 아님" },
  { kind: "진료비 영수증", doctorOnly: false, desc: "진료비 내역" },
];

export interface DocBody {
  visitDate: string;
  time?: string;
  dept: string;
  reason: string;
  opinion?: string;
  prescriptions?: Prescription[];
  amount?: number;
}

export type DocStatus = "sent" | "received" | "expired";

export interface IssuedDocument {
  v: 1;
  id: string;
  kind: DocKind;
  visitId: string;
  memberId: string;
  patientName: string;
  hospitalId: string;
  hospitalName: string;
  issuedBy: { name: string; role: Role };
  issuedAt: number;
  /** 이 시각까지 환자가 안 받으면 중계 사본 폐기 */
  relayExpiresAt: number;
  templateId: string;
  body: DocBody;
  /** 제증명 수수료(원). 병원이 정한 값이 발급 때 붙는다. 예전 서류는 0. */
  fee: number;
  status: DocStatus;
  receivedAt?: number;
  /** 환자가 수수료를 결제한 시각(시연). 0원이면 필요 없다. */
  feePaidAt?: number;
  sig: string;
}

const enc = new TextEncoder();

/** 서명 대상 — status·receivedAt(바뀌는 값)은 뺀다. 키 순서 고정. */
function signingMessage(d: Omit<IssuedDocument, "sig" | "status" | "receivedAt">): Uint8Array {
  return enc.encode(
    JSON.stringify({
      v: d.v,
      id: d.id,
      kind: d.kind,
      visitId: d.visitId,
      memberId: d.memberId,
      patientName: d.patientName,
      hospitalId: d.hospitalId,
      hospitalName: d.hospitalName,
      issuedBy: d.issuedBy,
      issuedAt: d.issuedAt,
      relayExpiresAt: d.relayExpiresAt,
      templateId: d.templateId,
      body: d.body,
      fee: d.fee,
    }),
  );
}

function rid(): string {
  const r = new Uint8Array(6);
  crypto.getRandomValues(r);
  let s = "";
  for (const b of r) s += String.fromCharCode(b);
  return `doc-${btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

export function listDocuments(): IssuedDocument[] {
  try {
    const raw = localStorage.getItem(DOCS_KEY);
    const v = raw ? JSON.parse(raw) : [];
    // 수수료 항목이 생기기 전 서류는 0원으로 읽는다.
    return Array.isArray(v) ? v.filter(isDoc).map((d) => ({ ...d, fee: typeof d.fee === "number" ? d.fee : 0 })) : [];
  } catch {
    return [];
  }
}

/** 수수료가 있고 아직 결제하지 않았으면 참 — 서류함에서 열기 전에 결제한다. */
export function needsFee(d: IssuedDocument): boolean {
  return d.fee > 0 && d.feePaidAt === undefined;
}

/** 환자가 수수료를 결제했다(시연: 실결제 없음). */
export function payFee(id: string, now: number = Date.now()) {
  save(listDocuments().map((d) => (d.id === id && d.feePaidAt === undefined ? { ...d, feePaidAt: now } : d)));
}

function save(list: IssuedDocument[]) {
  localStorage.setItem(DOCS_KEY, JSON.stringify(list));
}

function isDoc(v: unknown): v is IssuedDocument {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    o.v === 1 &&
    typeof o.id === "string" &&
    typeof o.kind === "string" &&
    typeof o.visitId === "string" &&
    typeof o.memberId === "string" &&
    typeof o.patientName === "string" &&
    typeof o.hospitalId === "string" &&
    typeof o.issuedAt === "number" &&
    typeof o.relayExpiresAt === "number" &&
    !!o.body &&
    typeof o.body === "object" &&
    typeof o.sig === "string" &&
    (o.fee === undefined || typeof o.fee === "number") &&
    (o.status === "sent" || o.status === "received" || o.status === "expired")
  );
}

export function documentsForVisit(visitId: string): IssuedDocument[] {
  return listDocuments().filter((d) => d.visitId === visitId);
}

export function documentsForMember(memberId: string): IssuedDocument[] {
  return listDocuments().filter((d) => d.memberId === memberId);
}

/** 발급 가능 여부 — 버튼 잠금과 같은 규칙. 가능하면 null, 아니면 이유. */
export function issueBlocker(visit: Visit, kind: DocKind, role: Role): string | null {
  const meta = DOC_KINDS.find((k) => k.kind === kind)!;
  if (visit.status === "예약") return "진료를 마친 뒤에 발급할 수 있어요.";
  if (meta.doctorOnly && role !== "doctor") return "진단서·소견서는 의사만 발급할 수 있어요.";
  if ((kind === "진단서" || kind === "소견서") && !visit.opinion?.trim()) return "소견이 없어 발급할 수 없어요.";
  if (kind === "처방전 사본" && !(visit.prescriptions && visit.prescriptions.length > 0)) return "처방이 없어 발급할 수 없어요.";
  return null;
}

export function issueDocument(input: {
  visit: Visit;
  kind: DocKind;
  session: Session;
  now?: number;
  templateId?: string;
}): IssuedDocument {
  const { visit, kind, session } = input;
  const blocker = issueBlocker(visit, kind, session.role);
  if (blocker) throw new Error(blocker);
  const hospital = getHospital();
  if (!hospital) throw new Error("병원을 먼저 등록하세요.");
  const now = input.now ?? Date.now();

  const body: DocBody = { visitDate: visit.date, ...(visit.time ? { time: visit.time } : {}), dept: visit.dept, reason: visit.reason };
  if (kind === "진단서" || kind === "소견서") body.opinion = visit.opinion!.trim();
  if (kind === "처방전 사본") body.prescriptions = visit.prescriptions!.map((p) => ({ ...p }));
  if (kind === "진료비 영수증") body.amount = visit.amount;

  const unsigned: Omit<IssuedDocument, "sig" | "status"> = {
    v: 1,
    id: rid(),
    kind,
    visitId: visit.id,
    memberId: visit.memberId,
    patientName: visit.patientName ?? getMember(visit.memberId)?.name ?? "환자",
    hospitalId: hospital.id,
    hospitalName: hospital.name,
    issuedBy: { name: session.name, role: session.role },
    issuedAt: now,
    relayExpiresAt: now + RELAY_DAYS * DAY,
    templateId: input.templateId ?? "default",
    body,
    fee: getFees()[kind],
  };
  const doc: IssuedDocument = { ...unsigned, status: "sent", sig: signWithHospital(signingMessage(unsigned)) };
  save([...listDocuments(), doc]);
  return doc;
}

export async function verifyDocument(d: IssuedDocument): Promise<boolean> {
  const { sig, status: _s, receivedAt: _r, feePaidAt: _p, ...body } = d;
  return verifyWithHospital(sig, signingMessage(body), d.hospitalId);
}

/** 환자가 열었다 — 중계 사본을 지웠다는 뜻(시연에서는 상태만 바뀐다). */
export function markReceived(id: string, now: number = Date.now()) {
  save(listDocuments().map((d) => (d.id === id && d.status === "sent" ? { ...d, status: "received", receivedAt: now } : d)));
}

/** 기한이 지난 미수령 서류를 폐기 상태로. 병원엔 "미수령"으로 보인다. */
export function expireRelays(now: number = Date.now()) {
  save(listDocuments().map((d) => (d.status === "sent" && now > d.relayExpiresAt ? { ...d, status: "expired" } : d)));
}
