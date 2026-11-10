import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BrandMark } from "../shell/BrandMark";
import { PLAN, saveTrialRequest } from "./trial";

/**
 * 병원용 소개·요금 페이지(/for-hospitals).
 *
 * 돈을 내는 쪽은 환자가 아니라 병원이다. 병원이 사는 것은 "환자 말이 정리돼 들어오는 사전
 * 문진"과 "서류를 환자 지갑으로 보내는 도구"이지, 환자를 보내주는 대가가 아니다(의료법 27조).
 * 효과 숫자는 아직 없다 — 주장하지 않고 파일럿에서 측정한다고 쓴다.
 *
 * 구성은 병원 소개 사이트의 문법(큰 제목의 어두운 첫 화면 → 숫자 띠 → 얻는 것 3가지 →
 * 번호 붙은 진료 흐름 → 요금 → 마무리 신청)을 따르되, 사진·문구·로고는 가져오지 않고
 * 첫 화면 그림은 우리 제품 자체(환자 말 → 정리된 문진)로 채운다.
 */
const won = (n: number) => n.toLocaleString("ko-KR") + "원";

const GAINS = [
  {
    title: "진료 전 정보 확인 시간",
    body: "환자가 집에서 말로 정리한 문진이 카드로 들어옵니다. 어디가·언제부터·얼마나, 그리고 \"없다고 답한 증상\"까지. 진료실에서 처음부터 다시 묻지 않습니다.",
  },
  {
    title: "예약 대비 방문",
    body: "예약한 환자가 실제로 왔는지 대기열에서 바로 보입니다. 재진 알림으로 다시 오게 하는 고리는 다음 단계입니다.",
  },
  {
    title: "서류 업무",
    body: "진단서·처방전 사본·영수증을 병원 양식 그대로 환자 지갑에 넣어 줍니다. 창구 재발급 문의가 줄어듭니다(서류 발급은 준비 중).",
  },
];

const STEPS = [
  { title: "환자가 집에서 말로 정리", body: "표현을 몰라도 누르면 됩니다. 느낌은 \"맥박이 뛰듯\" 같은 비유로 고르고, 위험 조합이면 예약보다 119 안내가 먼저입니다." },
  { title: "진료과·병원·시간 예약", body: "부위 묶음 규칙으로 진료과를 안내하고, 서울 의료기관 데이터에서 병원을 고릅니다. 병명은 말하지 않습니다." },
  { title: "의사 화면에 문진 카드", body: "환자 답을 해석 없이 그대로, 없다고 답한 증상까지. 우리 추천은 맨 아래 작게 — 판단은 의료진 몫입니다." },
  { title: "진료 완료 → 수납·서류", body: "소견·처방·진료비를 적으면 환자 수납 화면에 그대로 뜹니다. \"추천 과가 맞았나요?\" 한 번 누르면 정답 데이터가 쌓입니다." },
];

const STATS = [
  { n: "19,929", label: "서울 의료기관 데이터" },
  { n: "0건", label: "건강정보 서버 전송(기기 저장)" },
  { n: `${PLAN.trialDays}일`, label: "무료 체험" },
  { n: "측정 전", label: "효과 숫자 — 파일럿에서" },
];

export function ForHospitalsScreen() {
  const [hospital, setHospital] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const ready = hospital.trim() && contact.trim() && phone.trim();

  useEffect(() => {
    document.title = "병원용 안내 — 가족 의료지갑";
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    const r = saveTrialRequest({ hospital, contact, phone });
    setDone(r.hospital);
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      {/* 첫 화면 — 어두운 바탕, 큰 제목, 제품 자체가 그림 */}
      <section
        className="relative overflow-hidden bg-[var(--ink-deep)] text-white"
        style={{
          backgroundImage:
            "radial-gradient(900px 520px at 85% 10%, rgba(14,159,110,0.28), transparent 60%), radial-gradient(700px 400px at 0% 100%, rgba(255,90,77,0.16), transparent 60%)",
        }}
      >
        <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
          <header className="flex items-center justify-between py-5">
            <Link to="/more" className="flex items-center gap-2 text-sm font-bold">
              <BrandMark size={26} />
              가족 의료지갑
            </Link>
            <Link
              to="/doctor"
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold backdrop-blur transition hover:bg-white/15"
            >
              의사 화면 열기
            </Link>
          </header>

          <div className="grid items-center gap-10 py-14 md:grid-cols-[1.1fr_1fr] md:py-24">
            <div>
              <Eyebrow dark>병원용 · 의원 플랜</Eyebrow>
              <h1 className="mt-5 text-[40px] font-bold leading-[1.05] tracking-[-0.025em] md:text-[64px]">
                환자 말이 정리돼서
                <br />
                진료실에 들어옵니다
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75 md:text-lg">
                환자는 집에서 누르며 답하고, 의사는 진료 전에 정리된 문진 카드를 봅니다. 병명을 추정하는
                앱이 아닙니다 — 진단은 의료진 몫이고, 우리는 정리해서 전달합니다.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#trial" className="rounded-full bg-[var(--refund)] px-6 py-3 text-sm font-extrabold text-[var(--ink-deep)] transition hover:brightness-110">
                  {PLAN.trialDays}일 무료 체험
                </a>
                <a href="#flow" className="rounded-full bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15">
                  진료 흐름 보기
                </a>
              </div>
            </div>

            <HeroVisual />
          </div>

          <dl className="grid grid-cols-2 gap-y-8 border-t border-white/12 py-8 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label}>
                <dt className="order-2 text-xs text-white/60">{s.label}</dt>
                <dd className={`text-3xl font-bold tracking-tight md:text-4xl ${/\d/.test(s.n) ? "font-data" : ""}`}>{s.n}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* 병원이 얻는 것 */}
      <section aria-labelledby="gains" className="mx-auto w-full max-w-6xl px-5 py-16 md:px-8 md:py-28">
        <Eyebrow>병원이 얻는 것</Eyebrow>
        <h2 id="gains" className="mt-4 max-w-2xl text-[30px] font-bold leading-[1.15] tracking-[-0.02em] md:text-[44px]">
          접수와 진료실이 같이 편해지는
          <br className="hidden md:block" /> 세 가지
        </h2>
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {GAINS.map((g, i) => (
            <li key={g.title} className="rounded-2xl border border-[var(--mist)] bg-[var(--surface)] p-7 md:p-9">
              <p className="font-data text-xs text-[var(--refund-ink)]">0{i + 1}</p>
              <p className="mt-6 text-xl font-bold tracking-tight">{g.title}</p>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--ink-2)]">{g.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[var(--ink-2)]">
          효과 숫자는 아직 없습니다. 파일럿 병원 1~3곳에서 문진 시간·예약 대비 방문·서류 발급 수를
          <strong className="text-[var(--ink)]"> 측정</strong>한 뒤에 숫자로 말씀드립니다.
        </p>
      </section>

      {/* 진료 흐름 — 실제 순서이므로 번호를 붙인다 */}
      <section id="flow" aria-labelledby="flow-h" className="bg-[var(--ink)] text-white">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 md:px-8 md:py-28">
          <Eyebrow dark>진료 흐름</Eyebrow>
          <h2 id="flow-h" className="mt-4 text-[30px] font-bold leading-[1.15] tracking-[-0.02em] md:text-[44px]">
            환자부터 수납까지, 한 바퀴
          </h2>
          <ol className="mt-10 border-t border-white/12">
            {STEPS.map((s, i) => (
              <li key={s.title} className="grid gap-2 border-b border-white/12 py-6 md:grid-cols-[120px_1fr_1.3fr] md:gap-8 md:py-8">
                <span className="font-data text-xs uppercase tracking-[0.2em] text-white/55">STEP {i + 1}</span>
                <span className="text-lg font-bold tracking-tight">{s.title}</span>
                <span className="text-[15px] leading-relaxed text-white/75">{s.body}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 요금 */}
      <section aria-labelledby="plan" className="mx-auto w-full max-w-6xl px-5 py-16 md:px-8 md:py-28">
        <div className="grid gap-8 md:grid-cols-[1fr_1.1fr] md:items-start">
          <div>
            <Eyebrow>요금</Eyebrow>
            <h2 id="plan" className="mt-4 text-[30px] font-bold leading-[1.15] tracking-[-0.02em] md:text-[44px]">
              병원이 내고,
              <br />
              환자 앱은 무료
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[var(--ink-2)]">
              병원이 사는 것은 문진·서류 도구입니다. 환자를 보내 주는 대가가 아니며, 특정 병원을 추천하고{" "}
              <strong className="text-[var(--ink)]">추천 대가</strong>를 주고받는 일은 하지 않습니다(의료법 27조).
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--mist)] bg-[var(--surface)] p-7 md:p-9">
            <p className="font-data text-[11px] uppercase tracking-[0.2em] text-[var(--ink-2)]">{PLAN.name}</p>
            <p className="mt-3 text-5xl font-bold tracking-[-0.03em]">
              {won(PLAN.monthlyWon)}
              <span className="text-base font-medium text-[var(--ink-2)]"> /월</span>
            </p>
            <ul className="mt-6 space-y-2 text-[15px] text-[var(--ink)]">
              <li>· {PLAN.trialDays}일 무료 체험, 자동 결제 없음</li>
              <li>· 의사·직원 수 제한 없음</li>
              <li>· 환자 앱은 계속 무료</li>
            </ul>
            <p className="mt-6 rounded-xl bg-[var(--paper)] px-4 py-3 text-xs leading-relaxed text-[var(--ink-2)]">
              금액은 <strong className="text-[var(--ink)]">안(가정)</strong>입니다. 실제 요금은 파일럿 측정치와 변호사 검토 뒤에 정합니다.
            </p>
          </div>
        </div>
      </section>

      {/* 마무리 + 체험 신청 */}
      <section
        id="trial"
        aria-labelledby="trial-h"
        className="bg-[var(--ink-deep)] text-white"
        style={{ backgroundImage: "radial-gradient(800px 420px at 100% 0%, rgba(14,159,110,0.22), transparent 60%)" }}
      >
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1fr_1fr] md:items-center md:px-8 md:py-28">
          <div>
            <Eyebrow dark>체험 신청</Eyebrow>
            <h2 id="trial-h" className="mt-4 text-[30px] font-bold leading-[1.15] tracking-[-0.02em] md:text-[44px]">
              병원 한 곳부터
              <br />
              같이 재어 봅니다
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/75">
              <strong className="text-white">시연</strong>: 서버가 없어 신청은 이 기기에만 저장되고 아무에게도 전송되지 않습니다.
              실제 서비스에서는 담당자가 연락드리고, 병원 등록 → 직원 배지 발급 순서로 시작합니다.
            </p>
          </div>
          {done ? (
            <p role="status" className="rounded-2xl bg-[var(--surface)] p-7 text-[15px] leading-relaxed text-[var(--ink)]">
              <strong>{done}</strong> 체험 신청이 이 기기에 저장됐어요.
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-3 rounded-2xl bg-[var(--surface)] p-6 text-[var(--ink)] md:p-8">
              <Field id="t-hospital" label="병원 이름" value={hospital} onChange={setHospital} placeholder="예: 행복의원" />
              <Field id="t-contact" label="담당자" value={contact} onChange={setContact} placeholder="원장·원무 담당자 이름" />
              <Field id="t-phone" label="연락처" value={phone} onChange={setPhone} placeholder="전화 또는 이메일" />
              <button
                type="submit"
                disabled={!ready}
                className="mt-2 h-12 w-full rounded-full bg-[var(--ink)] text-sm font-extrabold text-white transition active:scale-[0.99] disabled:bg-[var(--mist)] disabled:text-[var(--ink-2)]"
              >
                {PLAN.trialDays}일 무료 체험 신청
              </button>
            </form>
          )}
        </div>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-5 py-8 text-xs leading-relaxed text-[var(--ink-2)] md:px-8">
        <p>
          지금 단계는 시연입니다. 병원 예약·EMR·전자처방·수납 시스템과 연동되기 전이며, 환자 화면과 의사 화면이
          같은 기기 저장소를 쓰는 미리보기입니다. 보안(저장 암호화·병원 인증)은 출시 전에 보완합니다.
        </p>
        <p className="mt-2">
          <Link to="/terms" className="underline">이용약관</Link> · <Link to="/privacy" className="underline">개인정보처리방침</Link>
        </p>
      </footer>
    </div>
  );
}

/** 환자 말풍선 → 정리된 문진 카드. 사진 대신 제품이 첫 화면의 그림이다. */
function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
      <div className="rounded-3xl rounded-bl-md bg-[var(--vital)] px-5 py-4 text-[15px] font-semibold leading-relaxed text-white shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        머리가 아프고 다리도 근데 좀 아프네
        <br />
        그리고 어깨가 왜 뻐근하지?
      </div>
      <div className="my-3 ml-6 h-8 w-px bg-white/30" />
      <div className="rounded-3xl rounded-tr-md bg-[var(--surface)] px-5 py-4 text-[var(--ink)] shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <p className="font-data text-[10px] uppercase tracking-[0.2em] text-[var(--ink-2)]">의사에게 전달되는 문진</p>
        <p className="mt-2 text-[15px] leading-relaxed">
          1~3일 전부터 <b>머리가 욱신욱신</b> 아프고, <b>목·어깨가 뻐근하고 결리고</b>, 다리·발이 불편해요. 가장
          불편한 곳은 머리예요. 아픈 정도 5/10.
        </p>
        <p className="mt-2 text-xs text-[var(--ink-2)]">없다고 답한 증상: 열 · 구토 · 저림</p>
      </div>
    </div>
  );
}

function Eyebrow({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p className={`flex items-center gap-2 font-data text-[11px] uppercase tracking-[0.22em] ${dark ? "text-white/60" : "text-[var(--ink-2)]"}`}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--refund)]" />
      {children}
    </p>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-xs font-bold text-[var(--ink-2)]">{label}</span>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 h-11 w-full rounded-xl border border-[var(--mist)] bg-[var(--paper)] px-3 text-sm outline-none focus:border-[var(--ink)]"
      />
    </label>
  );
}
