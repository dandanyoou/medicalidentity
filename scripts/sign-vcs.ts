// 빌드 타임 VC pre-signing 스크립트 (참고용).
// 본 데모는 wallet 첫 로드 시 런타임에 서명하지만, 프로덕션에서는 이 스크립트를
// `npm run prebuild`로 호출하여 정적 JSON으로 출력하는 것이 좋다.
//
// 실행: `bun run scripts/sign-vcs.ts` 또는 `tsx scripts/sign-vcs.ts`
// 출력: stdout에 patient-vcs JSON + QR 페이로드 바이트 수 (2,953 바이트 한계 경고)

import { getPatientVCs } from "../src/data/patient-vcs";

function bytes(s: string): number {
  return new TextEncoder().encode(s).length;
}

function main() {
  const vcs = getPatientVCs();
  const lengths = {
    mDL: bytes(vcs.mDL.compact),
    bloodType: bytes(vcs.bloodType.compact),
    allergy: bytes(vcs.allergy.compact),
  };
  const total = lengths.mDL + lengths.bloodType + lengths.allergy;
  const QR_V40_LIMIT = 2953;

  console.log("Signed VC sizes (bytes):");
  for (const [k, v] of Object.entries(lengths)) {
    console.log(`  ${k.padEnd(12)} ${v}`);
  }
  console.log(`  ${"total".padEnd(12)} ${total}`);

  if (total > QR_V40_LIMIT) {
    console.warn(
      `\n⚠️  Total ${total} bytes exceeds QR v40 ECC-L limit (${QR_V40_LIMIT}).`,
    );
    console.warn(
      `   Consider: drop mDL from QR (use anchor-only), reduce disclosures, or use binary QR codec.`,
    );
  } else {
    console.log(`\n✓ Under QR v40 limit (${QR_V40_LIMIT} bytes)`);
  }
}

main();
