#!/usr/bin/env node
/**
 * 심평원 "전국 병의원 및 약국 현황" CSV → 서울 병원 구별 JSON.
 *
 * 출처: 공공데이터포털 15051059 (건강보험심사평가원), 공공누리 제1유형(출처표시).
 * 입력: 1.병원정보서비스(…).csv, 5.의료기관별상세정보서비스_03_진료과목정보(…).csv (cp949)
 * 출력:
 *   public/data/hospitals/seoul/<구>.json  — 구별 병원 목록(화면에서 필요할 때 받음)
 *   src/booking/hospitals.seoul-index.json — 구 목록·건수, 상급종합병원 목록, 기준일(번들에 포함)
 *
 * 사용: node scripts/build-hospitals.mjs <병원정보.csv> <진료과목정보.csv> [기준일 YYYY-MM-DD]
 * 입력 파일은 내려받은 폴더에 그대로 두고 경로로만 넘긴다.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const [, , hospitalsCsv, deptsCsv, asOf = "2026-09-30"] = process.argv;
if (!hospitalsCsv || !deptsCsv) {
  console.error("사용: node scripts/build-hospitals.mjs <병원정보.csv> <진료과목정보.csv> [기준일]");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "data", "hospitals", "seoul");
const indexPath = join(root, "src", "booking", "hospitals.seoul-index.json");

// 약국·조산원은 병원 선택 화면에 맞지 않아 뺀다. 나머지(상급종합~의원·치과·한방·보건기관)는 모두 담는다.
const EXCLUDE_TYPES = new Set(["약국", "조산원"]);

function readCp949(path) {
  return new TextDecoder("euc-kr").decode(readFileSync(path));
}

/** 따옴표 안의 쉼표·줄바꿈을 처리하는 작은 CSV 파서. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    if (row.some((x) => x !== "")) rows.push(row);
  }
  return rows;
}

function col(header, name) {
  const i = header.indexOf(name);
  if (i < 0) throw new Error(`열이 없습니다: ${name}`);
  return i;
}

/** 긴 암호화요양기호를 짧은 안정 id로(FNV-1a 32bit → base36). 구 안에서 유일하면 충분하다. */
function shortId(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/**
 * 법인명 접두어를 떼어 화면용 이름을 만든다.
 * "재단법인아산사회복지재단 서울아산병원" → "서울아산병원", "(의)서봉의료재단 보강병원" → "보강병원".
 * 띄어쓰기가 없는 이름은 접두어만 뗀다. 원래 이름은 name에 그대로 남긴다.
 */
function shortName(name) {
  let s = name.replace(/^\((의|재|사|학|복지|새)\)\s*/, "");
  s = s.replace(/^(재단법인|학교법인|의료법인|사회복지법인|사단법인)\s*/, "");
  // 법인명 뒤에 띄어쓰기가 있으면 마지막 덩어리가 병원 이름이다(…재단 서울아산병원).
  if (/(법인|재단|학원)\s+\S+$/.test(s)) s = s.replace(/^.*(법인|재단|학원)\s+/, "");
  return s.trim() || name;
}

// ── 1. 병원 기본정보 ──────────────────────────────────────────────────────
const hRows = parseCsv(readCp949(hospitalsCsv));
const hh = hRows[0];
const H = {
  code: col(hh, "암호화요양기호"),
  name: col(hh, "요양기관명"),
  type: col(hh, "종별코드명"),
  sido: col(hh, "시도코드명"),
  sigungu: col(hh, "시군구코드명"),
  dong: col(hh, "읍면동"),
  addr: col(hh, "주소"),
  tel: col(hh, "전화번호"),
  doctors: col(hh, "총의사수"),
  x: col(hh, "좌표(X)"),
  y: col(hh, "좌표(Y)"),
};

const byCode = new Map();
for (const r of hRows.slice(1)) {
  if (r[H.sido] !== "서울") continue;
  if (EXCLUDE_TYPES.has(r[H.type])) continue;
  const gu = r[H.sigungu].replace(/^서울/, ""); // "서울강남구" → "강남구"
  const name = r[H.name].trim();
  const short = shortName(name);
  byCode.set(r[H.code], {
    id: shortId(r[H.code]),
    name,
    ...(short !== name ? { shortName: short } : {}),
    type: r[H.type],
    gu,
    dong: r[H.dong] || undefined,
    addr: r[H.addr],
    tel: r[H.tel] || undefined,
    doctors: Number(r[H.doctors]) || 0,
    lat: Number(r[H.y]) || undefined,
    lng: Number(r[H.x]) || undefined,
    depts: [],
  });
}

// ── 2. 진료과목 ───────────────────────────────────────────────────────────
const dRows = parseCsv(readCp949(deptsCsv));
const dh = dRows[0];
const D = { code: col(dh, "암호화요양기호"), dept: col(dh, "진료과목코드명") };
for (const r of dRows.slice(1)) {
  const h = byCode.get(r[D.code]);
  if (!h) continue;
  const d = r[D.dept].trim();
  if (d && !h.depts.includes(d)) h.depts.push(d);
}

// ── 3. 구별 파일 ──────────────────────────────────────────────────────────
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const byGu = new Map();
for (const h of byCode.values()) {
  if (!byGu.has(h.gu)) byGu.set(h.gu, []);
  byGu.get(h.gu).push(h);
}

const TYPE_RANK = { 상급종합: 0, 종합병원: 1, 병원: 2, 요양병원: 3, 정신병원: 3, 치과병원: 3, 한방병원: 3, 의원: 4 };
const rank = (t) => TYPE_RANK[t] ?? 5;

const gus = [];
for (const [gu, list] of [...byGu.entries()].sort((a, b) => a[0].localeCompare(b[0], "ko"))) {
  // 큰 병원이 먼저, 같은 급이면 의사 수 많은 곳, 그다음 이름순.
  list.sort((a, b) => rank(a.type) - rank(b.type) || b.doctors - a.doctors || a.name.localeCompare(b.name, "ko"));
  const ids = new Set();
  for (const h of list) {
    if (ids.has(h.id)) throw new Error(`id 충돌: ${gu} ${h.name}`);
    ids.add(h.id);
  }
  writeFileSync(join(outDir, `${gu}.json`), JSON.stringify(list));
  gus.push({ gu, count: list.length });
}

const major = [...byCode.values()]
  .filter((h) => h.type === "상급종합")
  .sort((a, b) => b.doctors - a.doctors)
  .map((h) => ({ id: h.id, name: h.shortName ?? h.name, gu: h.gu }));

writeFileSync(
  indexPath,
  JSON.stringify(
    {
      source: "건강보험심사평가원 전국 병의원 및 약국 현황",
      sourceUrl: "https://www.data.go.kr/data/15051059/fileData.do",
      license: "공공누리 제1유형(출처표시)",
      asOf,
      total: byCode.size,
      gus,
      major,
    },
    null,
    2,
  ) + "\n",
);

const typeCounts = {};
for (const h of byCode.values()) typeCounts[h.type] = (typeCounts[h.type] ?? 0) + 1;
console.log(`서울 ${byCode.size}곳, ${gus.length}개 구, 상급종합 ${major.length}곳`);
console.log(typeCounts);
console.log(`진료과목 없는 곳: ${[...byCode.values()].filter((h) => h.depts.length === 0).length}`);
