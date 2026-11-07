// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  INSURERS,
  listClaims,
  addClaim,
  getClaimByVisit,
  resetClaims,
} from "./store";

beforeEach(() => resetClaims());
afterEach(() => resetClaims());

describe("insurance claim store", () => {
  it("실손 보험사 목록이 있다", () => {
    expect(INSURERS.length).toBeGreaterThan(3);
  });

  it("처음엔 청구가 없다", () => {
    expect(listClaims()).toHaveLength(0);
  });

  it("청구하면 접수 상태로 저장되고 방문으로 조회된다", () => {
    const claim = addClaim("v-seed-1", "삼성화재");
    expect(claim.status).toBe("접수");
    expect(claim.insurer).toBe("삼성화재");
    expect(getClaimByVisit("v-seed-1")?.id).toBe(claim.id);
    expect(listClaims()).toHaveLength(1);
  });
});
