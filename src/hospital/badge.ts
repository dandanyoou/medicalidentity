/**
 * 병원 등록 · 직원 배지(서명된 자격증명) · 배지 로그인 — 시연.
 *
 * 구조: 병원을 등록하면 이 기기에 병원 키(ed25519)가 생긴다. 관리자가 직원에게 배지를
 * 발급하면 배지(발급 병원·이름·역할·만료)에 병원 키로 서명이 붙는다. 의사 화면과 서류
 * 발급은 배지로 로그인한 뒤에만 열린다. 배지 안에는 환자 정보가 없다 — 잃어버려도 환자
 * 정보가 새지 않고, 폐기하면 그 배지로는 더 못 들어온다.
 *
 * 시연의 한계(화면에도 밝힌다): 서버가 없어 병원 키·배지·세션이 모두 이 기기 저장소에
 * 평문으로 있다. 실제 서비스에서는 병원 키는 서버(HSM)에, 배지 검증도 서버에서 하고,
 * 의료인 자격은 공적 발급 체계가 생기면 그쪽 배지를 받는다.
 */
import { ed25519 } from "@noble/curves/ed25519";

export const KEY_HOSPITAL = "medid.hospital.registration";
export const KEY_BADGES = "medid.hospital.badges";
export const KEY_SESSION = "medid.hospital.session";

export type Role = "doctor" | "staff";
export const ROLE_LABEL: Record<Role, string> = { doctor: "의사", staff: "간호·원무" };

export interface HospitalRegistration {
  id: string;
  name: string;
  admin: string;
  registeredAt: string;
  pk: string; // base64url 공개키
  sk: string; // base64url 비밀키 — 시연이라 기기 저장. 실제는 서버 보관.
}

export interface Badge {
  v: 1;
  id: string;
  hospitalId: string;
  hospitalName: string;
  name: string;
  role: Role;
  iat: number; // epoch seconds
  exp: number;
  sig: string; // base64url(ed25519)
}

export interface StoredBadge extends Badge {
  status: "active" | "revoked";
}

export interface Session {
  badgeId: string;
  hospitalName: string;
  name: string;
  role: Role;
  exp: number;
}

export type VerifyOutcome =
  | { ok: true }
  | { ok: false; reason: "no-hospital" | "wrong-hospital" | "bad-signature" | "expired" | "revoked" };

const enc = new TextEncoder();
const dec = new TextDecoder();
const DAY = 86_400;

function b64u(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64u(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}
function rid(prefix: string): string {
  const r = new Uint8Array(6);
  crypto.getRandomValues(r);
  return `${prefix}-${b64u(r)}`;
}
function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

// ---- 병원 등록 ----

export function getHospital(): HospitalRegistration | null {
  const h = read<HospitalRegistration>(KEY_HOSPITAL);
  return h && typeof h.id === "string" && typeof h.pk === "string" && typeof h.sk === "string" ? h : null;
}

export function registerHospital(input: { name: string; admin: string }): HospitalRegistration {
  const name = input.name.trim();
  const admin = input.admin.trim();
  if (!name || !admin) throw new Error("병원 이름과 관리자 이름이 필요해요.");
  const sk = new Uint8Array(32);
  crypto.getRandomValues(sk);
  const pk = ed25519.getPublicKey(sk);
  const h: HospitalRegistration = {
    id: rid("hosp"),
    name,
    admin,
    registeredAt: new Date().toISOString(),
    pk: b64u(pk),
    sk: b64u(sk),
  };
  localStorage.setItem(KEY_HOSPITAL, JSON.stringify(h));
  localStorage.removeItem(KEY_BADGES);
  localStorage.removeItem(KEY_SESSION);
  return h;
}

// ---- 병원 키로 서명(서류 발급 등이 재사용) ----

export function signWithHospital(message: Uint8Array): string {
  const h = getHospital();
  if (!h) throw new Error("병원을 먼저 등록하세요.");
  return b64u(ed25519.sign(message, fromB64u(h.sk)));
}

/** 이 기기에 등록된 병원의 공개키로 확인. hospitalId가 다르면 거짓. */
export function verifyWithHospital(sig: string, message: Uint8Array, hospitalId?: string): boolean {
  const h = getHospital();
  if (!h || (hospitalId && h.id !== hospitalId)) return false;
  try {
    return ed25519.verify(fromB64u(sig), message, fromB64u(h.pk));
  } catch {
    return false;
  }
}

// ---- 배지 ----

/** 서명 대상 — 키 순서를 고정해 양쪽에서 같은 바이트가 나오게. */
function signingMessage(b: Omit<Badge, "sig">): Uint8Array {
  return enc.encode(
    JSON.stringify({ v: b.v, id: b.id, hospitalId: b.hospitalId, hospitalName: b.hospitalName, name: b.name, role: b.role, iat: b.iat, exp: b.exp }),
  );
}

export function listBadges(): StoredBadge[] {
  const v = read<unknown>(KEY_BADGES);
  return Array.isArray(v) ? (v.filter(isBadge) as StoredBadge[]) : [];
}

function saveBadges(list: StoredBadge[]) {
  localStorage.setItem(KEY_BADGES, JSON.stringify(list));
}

export function issueBadge(input: { name: string; role: Role; now?: number; days?: number }): Badge {
  const h = getHospital();
  if (!h) throw new Error("병원을 먼저 등록하세요.");
  const name = input.name.trim();
  if (!name) throw new Error("직원 이름이 필요해요.");
  const iat = input.now ?? nowSec();
  const body: Omit<Badge, "sig"> = {
    v: 1,
    id: rid("badge"),
    hospitalId: h.id,
    hospitalName: h.name,
    name,
    role: input.role,
    iat,
    exp: iat + (input.days ?? 180) * DAY,
  };
  const sig = ed25519.sign(signingMessage(body), fromB64u(h.sk));
  const badge: Badge = { ...body, sig: b64u(sig) };
  saveBadges([...listBadges(), { ...badge, status: "active" }]);
  return badge;
}

export function revokeBadge(id: string) {
  saveBadges(listBadges().map((b) => (b.id === id ? { ...b, status: "revoked" } : b)));
  const s = read<Session>(KEY_SESSION);
  if (s?.badgeId === id) localStorage.removeItem(KEY_SESSION);
}

export function badgeCode(b: Badge): string {
  return b64u(enc.encode(JSON.stringify(b)));
}

export function decodeBadge(code: string): Badge | null {
  try {
    const v = JSON.parse(dec.decode(fromB64u(code.trim())));
    return isBadge(v) ? (v as Badge) : null;
  } catch {
    return null;
  }
}

function isBadge(v: unknown): v is Badge {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    o.v === 1 &&
    typeof o.id === "string" &&
    typeof o.hospitalId === "string" &&
    typeof o.hospitalName === "string" &&
    typeof o.name === "string" &&
    (o.role === "doctor" || o.role === "staff") &&
    typeof o.iat === "number" &&
    typeof o.exp === "number" &&
    typeof o.sig === "string"
  );
}

export async function verifyBadge(b: Badge, opts: { now?: number } = {}): Promise<VerifyOutcome> {
  const h = getHospital();
  if (!h) return { ok: false, reason: "no-hospital" };
  if (b.hospitalId !== h.id) return { ok: false, reason: "wrong-hospital" };
  try {
    const { sig, ...body } = b;
    if (!ed25519.verify(fromB64u(sig), signingMessage(body), fromB64u(h.pk))) {
      return { ok: false, reason: "bad-signature" };
    }
  } catch {
    return { ok: false, reason: "bad-signature" };
  }
  if ((opts.now ?? nowSec()) >= b.exp) return { ok: false, reason: "expired" };
  const stored = listBadges().find((x) => x.id === b.id);
  if (stored?.status === "revoked") return { ok: false, reason: "revoked" };
  return { ok: true };
}

// ---- 세션 ----

export type LoginOutcome = VerifyOutcome | { ok: false; reason: "invalid" };

export async function loginWithBadge(code: string): Promise<LoginOutcome> {
  const b = decodeBadge(code);
  if (!b) return { ok: false, reason: "invalid" };
  const r = await verifyBadge(b);
  if (!r.ok) return r;
  const s: Session = { badgeId: b.id, hospitalName: b.hospitalName, name: b.name, role: b.role, exp: b.exp };
  localStorage.setItem(KEY_SESSION, JSON.stringify(s));
  return { ok: true };
}

export function currentSession(): Session | null {
  const s = read<Session>(KEY_SESSION);
  if (!s || typeof s.badgeId !== "string" || typeof s.exp !== "number") return null;
  const stored = listBadges().find((x) => x.id === s.badgeId);
  if (!stored || stored.status === "revoked" || nowSec() >= s.exp) {
    localStorage.removeItem(KEY_SESSION);
    return null;
  }
  return s;
}

export function logout() {
  localStorage.removeItem(KEY_SESSION);
}

export const REASON_TEXT: Record<Exclude<LoginOutcome, { ok: true }>["reason"], string> = {
  invalid: "배지 코드를 읽을 수 없어요. 복사한 전체 코드인지 확인하세요.",
  "no-hospital": "이 기기에 등록된 병원이 없어요. 병원을 먼저 등록하세요.",
  "wrong-hospital": "이 기기에 등록된 병원이 발급한 배지가 아니에요.",
  "bad-signature": "서명이 맞지 않아요. 배지가 고쳐졌거나 손상됐어요.",
  expired: "만료된 배지예요. 관리자에게 재발급을 요청하세요.",
  revoked: "폐기된 배지예요.",
};
