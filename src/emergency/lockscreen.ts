/**
 * 응급 잠금화면 — 폰이 잠겨 있어도 보이는 1층 생명 정보.
 *
 * 설계: docs/designs/emergency-access.md. 1층(혈액형·중증 알레르기·핵심 약·비상연락처 1명)은
 * 아이폰 '의료 ID'처럼 토큰을 읽은 누구나 바로 본다. 이름·주민등록번호는 넣지 않는다.
 *
 * QR에는 `https://<origin>/e#<payload>` 를 담는다. `#` 뒤는 브라우저가 서버로 보내지 않으므로
 * 서버 없이도 아무 카메라로 열리는 보통 웹페이지가 된다(열람 페이지는 E2). 페이로드는 본인
 * 키(ed25519)로 서명해 변조를 막는다 — 발급 기관 서명이 아니라 "이 폰 주인이 적은 그대로"라는
 * 뜻이다.
 */
import { ed25519 } from "@noble/curves/ed25519";
import QRCode from "qrcode";
import type { DemoKey } from "../data/issuer-keys";
import { formatPhone } from "../family/verify";

export interface Tier1 {
  blood?: string; // "A+"
  allergens?: string[]; // "페니실린(중증)"
  meds?: string[];
  contact?: { label: string; phone: string }; // phone: 숫자만
}

export interface Tier1Envelope {
  v: 1;
  t1: Tier1;
  iat: number; // epoch seconds
  kid: string; // 본인 did
  pk: string; // 본인 공개키(base64url)
  sig: string; // base64url(ed25519)
}

const enc = new TextEncoder();
const dec = new TextDecoder();

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

/** 서명 대상 — 키 순서를 고정해 양쪽에서 같은 바이트가 나오게. */
function signingMessage(e: Omit<Tier1Envelope, "sig">): Uint8Array {
  return enc.encode(JSON.stringify({ v: e.v, t1: e.t1, iat: e.iat, kid: e.kid, pk: e.pk }));
}

export async function buildTier1Url(
  t1: Tier1,
  opts: { origin: string; holder: DemoKey; now?: number },
): Promise<string> {
  const body: Omit<Tier1Envelope, "sig"> = {
    v: 1,
    t1,
    iat: opts.now ?? Math.floor(Date.now() / 1000),
    kid: opts.holder.did,
    pk: b64u(opts.holder.publicKey),
  };
  const sig = ed25519.sign(signingMessage(body), opts.holder.privateKey);
  const envelope: Tier1Envelope = { ...body, sig: b64u(sig) };
  return `${opts.origin}/e#${b64u(enc.encode(JSON.stringify(envelope)))}`;
}

export function decodeTier1(url: string): Tier1Envelope | null {
  const i = url.indexOf("#");
  if (i < 0) return null;
  try {
    const json = dec.decode(fromB64u(url.slice(i + 1)));
    const e = JSON.parse(json) as Partial<Tier1Envelope>;
    if (e.v !== 1 || !e.t1 || typeof e.t1 !== "object") return null;
    if (typeof e.iat !== "number" || typeof e.kid !== "string" || typeof e.pk !== "string" || typeof e.sig !== "string") {
      return null;
    }
    return e as Tier1Envelope;
  } catch {
    return null;
  }
}

export async function verifyTier1(e: Tier1Envelope): Promise<boolean> {
  try {
    const { sig, ...body } = e;
    return ed25519.verify(fromB64u(sig), signingMessage(body), fromB64u(e.pk));
  } catch {
    return false;
  }
}

/** 배경 이미지에 넣을 글줄 — 고른 항목만, 한 줄씩 짧게. */
export function tier1Lines(t1: Tier1): string[] {
  const lines: string[] = [];
  if (t1.blood) lines.push(`혈액형 ${t1.blood}`);
  if (t1.allergens && t1.allergens.length > 0) lines.push(`알레르기 ${t1.allergens.join(", ")}`);
  if (t1.meds && t1.meds.length > 0) lines.push(`복용약 ${t1.meds.join(", ")}`);
  if (t1.contact) lines.push(`비상연락 ${t1.contact.label} ${formatPhone(t1.contact.phone)}`);
  return lines;
}

/** 아이폰 의료 ID · 안드로이드 긴급 정보의 "메모"에 붙여넣을 한 줄. */
export function medicalIdText(t1: Tier1): string {
  const parts: string[] = [];
  if (t1.blood) parts.push(`혈액형 ${t1.blood}`);
  if (t1.allergens && t1.allergens.length > 0) parts.push(`알레르기: ${t1.allergens.join(", ")}`);
  if (t1.meds && t1.meds.length > 0) parts.push(`복용약: ${t1.meds.join(", ")}`);
  if (t1.contact) parts.push(`비상연락: ${t1.contact.label} ${formatPhone(t1.contact.phone)}`);
  parts.push("가족 의료지갑 응급 QR은 잠금화면 배경에");
  return parts.join(" · ");
}

export interface RenderInput {
  url: string;
  lines: string[];
}

/**
 * 잠금화면 배경 PNG(1080×2340) — 위 40%는 시계 자리로 비우고, 가운데에 QR, 아래에 글줄.
 * 브라우저 canvas가 필요하다(테스트에서는 주입으로 대체).
 */
export async function renderLockScreenImage({ url, lines }: RenderInput): Promise<string> {
  const W = 1080;
  const H = 2340;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이 브라우저에서는 이미지를 만들 수 없어요");

  ctx.fillStyle = "#0b3b3c";
  ctx.fillRect(0, 0, W, H);

  const qrSize = 560;
  const qr = await QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 1, width: qrSize });
  const img = await loadImage(qr);
  const cardW = qrSize + 80;
  const cardX = (W - cardW) / 2;
  const cardY = Math.round(H * 0.4);
  roundRect(ctx, cardX, cardY, cardW, cardW, 48);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.drawImage(img, cardX + 40, cardY + 40, qrSize, qrSize);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "bold 44px -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
  ctx.fillText("응급 의료정보 · 카메라로 QR을 읽어주세요", W / 2, cardY - 56);

  let y = cardY + cardW + 110;
  ctx.font = "600 50px -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
  for (const line of lines) {
    ctx.fillText(line, W / 2, y);
    y += 78;
  }

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "36px -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
  ctx.fillText("가족 의료지갑 · 이름·주민번호는 담지 않음", W / 2, H - 140);

  return canvas.toDataURL("image/png");
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("QR 이미지를 불러오지 못했어요"));
    img.src = src;
  });
}
