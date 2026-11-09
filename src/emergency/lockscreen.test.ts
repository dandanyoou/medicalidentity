import { describe, expect, it } from "vitest";
import {
  buildTier1Url,
  decodeTier1,
  medicalIdText,
  tier1Lines,
  verifyTier1,
  type Tier1,
} from "./lockscreen";
import { DEMO_HOLDER } from "../data/issuer-keys";

const t1: Tier1 = {
  blood: "A+",
  allergens: ["페니실린(중증)"],
  meds: ["아스피린 100mg"],
  contact: { label: "딸 김단유", phone: "01012345678" },
};

describe("응급 잠금화면 1층 정보", () => {
  it("아무 카메라로 열리는 주소를 만들고, 정보는 #뒤(서버로 안 감)에 들어간다", async () => {
    const url = await buildTier1Url(t1, { origin: "https://medid.example", holder: DEMO_HOLDER, now: 1700000000 });
    expect(url.startsWith("https://medid.example/e#")).toBe(true);
    expect(url.includes("?")).toBe(false);
    // 잠금화면에서 폰 카메라로 읽히려면 QR이 너무 촘촘하면 안 된다.
    expect(url.length).toBeLessThan(600);
  });

  it("되돌려 읽으면 같은 내용이고, 본인 키 서명이 맞는다", async () => {
    const url = await buildTier1Url(t1, { origin: "https://medid.example", holder: DEMO_HOLDER, now: 1700000000 });
    const decoded = decodeTier1(url)!;
    expect(decoded.t1).toEqual(t1);
    expect(decoded.iat).toBe(1700000000);
    expect(await verifyTier1(decoded)).toBe(true);
  });

  it("내용을 바꾸면 서명 검증에 실패한다", async () => {
    const url = await buildTier1Url(t1, { origin: "https://medid.example", holder: DEMO_HOLDER, now: 1700000000 });
    const decoded = decodeTier1(url)!;
    decoded.t1.blood = "O-";
    expect(await verifyTier1(decoded)).toBe(false);
  });

  it("깨진 주소는 null", () => {
    expect(decodeTier1("https://medid.example/e#%%%")).toBeNull();
    expect(decodeTier1("https://medid.example/e")).toBeNull();
  });

  it("이미지에 넣을 글줄 — 고른 항목만, 짧게", () => {
    expect(tier1Lines(t1)).toEqual([
      "혈액형 A+",
      "알레르기 페니실린(중증)",
      "복용약 아스피린 100mg",
      "비상연락 딸 김단유 010-1234-5678",
    ]);
    expect(tier1Lines({ blood: "B-" })).toEqual(["혈액형 B-"]);
  });

  it("아이폰 의료 ID·안드로이드 긴급 정보에 붙여넣을 문구", () => {
    expect(medicalIdText(t1)).toBe(
      "혈액형 A+ · 알레르기: 페니실린(중증) · 복용약: 아스피린 100mg · 비상연락: 딸 김단유 010-1234-5678 · 가족 의료지갑 응급 QR은 잠금화면 배경에",
    );
  });
});
