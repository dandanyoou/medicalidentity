import { describe, it, expect } from "vitest";
import {
  checkDuplicatePrescription,
  appendChainEntry,
  verifyChain,
  credentialDigest,
  SEED_PRIOR_VISITS,
  type ChainEntry,
} from "./index";

const REFERENCE = new Date("2026-09-30T00:00:00Z").getTime();

describe("checkDuplicatePrescription", () => {
  it("[#1] flags a controlled substance requested at 2+ other hospitals within window", () => {
    const result = checkDuplicatePrescription(
      "Oxycodone",
      SEED_PRIOR_VISITS,
      REFERENCE,
    );
    expect(result.flagged).toBe(true);
    expect(result.distinctHospitals).toBeGreaterThanOrEqual(2);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("[#2] does not flag a non-controlled drug even with matching visit history", () => {
    const result = checkDuplicatePrescription(
      "Ibuprofen",
      SEED_PRIOR_VISITS,
      REFERENCE,
    );
    expect(result.flagged).toBe(false);
    expect(result.reasons).toEqual([]);
  });

  it("[#3] does not flag when prior visits fall outside the window", () => {
    const oldVisits = SEED_PRIOR_VISITS.map((v) => ({ ...v, date: "2026-01-01" }));
    const result = checkDuplicatePrescription("Oxycodone", oldVisits, REFERENCE);
    expect(result.flagged).toBe(false);
  });
});

describe("hash-chain", () => {
  it("[#4] verifies a valid untampered chain", () => {
    let chain: ChainEntry[] = [];
    chain = appendChainEntry(chain, credentialDigest("did:key:demo-hospital", "jti-1"), 1000);
    chain = appendChainEntry(chain, credentialDigest("did:key:demo-hospital", "jti-2"), 2000);
    const result = verifyChain(chain);
    expect(result.ok).toBe(true);
    expect(result.brokenAtSeq).toBeNull();
  });

  it("[#5] detects tampering — a modified entry breaks the chain", () => {
    let chain: ChainEntry[] = [];
    chain = appendChainEntry(chain, credentialDigest("did:key:demo-hospital", "jti-1"), 1000);
    chain = appendChainEntry(chain, credentialDigest("did:key:demo-hospital", "jti-2"), 2000);
    const tampered: ChainEntry[] = [
      { ...chain[0], credentialDigest: "tampered-digest" },
      chain[1],
    ];
    const result = verifyChain(tampered);
    expect(result.ok).toBe(false);
    expect(result.brokenAtSeq).toBe(0);
  });

  it("[#6] never stores plaintext — digest only depends on issuer+jti, not any PHI field", () => {
    const d1 = credentialDigest("did:key:demo-hospital", "jti-1");
    const d2 = credentialDigest("did:key:demo-hospital", "jti-1");
    expect(d1).toBe(d2); // deterministic, no embedded plaintext claim
    expect(d1).not.toContain("Oxycodone");
  });
});
