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
      <div className="mx-auto w-full max-w-md px-5 pb-16 pt-6 md:max-w-3xl md:px-8">
        <header className="flex items-center justify-between">
          <Link to="/more" className="flex items-center gap-2 text-sm font-bold">
            <BrandMark size={26} />
            가족 의료지갑
          </Link>
          <Link to="/doctor" className="rounded-full border border-[var(--mist)] bg-[var(--surface)] px-4 py-2 text-xs font-bold">
            의사 화면 열기
          </Link>
        </header>

        <section className="mt-10 md:mt-14">
          <p className="font-data text-[11px] uppercase tracking-[0.2em] text-[var(--ink-2)]">병원용 · 의원 플랜</p>
          <h1 className="mt-3 text-[34px] font-extrabold leading-[1.15] tracking-tight md:text-[46px]">
            환자 말이 정리돼서
            <br />
            진료실에 들어옵니다
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[var(--ink-2)] md:text-lg">
            환자는 집에서 누르며 답하고, 의사는 진료 전에 정리된 문진 카드를 봅니다. 병명을 추정하는
            앱이 아닙니다 — 진단은 의료진 몫이고, 우리는 정리해서 전달합니다.
          </p>
        </section>

        <section aria-labelledby="gains" className="mt-10">
          <h2 id="gains" className="text-lg font-extrabold">병원이 얻는 것</h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-3">
            {GAINS.map((g, i) => (
              <li key={g.title} className="rounded-3xl bg-[var(--surface)] p-5 shadow-[0_1px_12px_rgba(11,59,60,0.07)]">
                <p className="font-data text-xs text-[var(--refund-ink)]">0{i + 1}</p>
                <p className="mt-1 text-base font-extrabold">{g.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ink-2)]">{g.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 rounded-2xl border-l-4 border-[var(--refund)] bg-[var(--refund)]/8 px-4 py-3 text-xs leading-relaxed text-[var(--ink)]">
            효과 숫자는 아직 없습니다. 파일럿 병원 1~3곳에서 문진 시간·예약 대비 방문·서류 발급 수를
            <strong> 측정</strong>한 뒤에 숫자로 말씀드립니다.
          </p>
        </section>

        <section aria-labelledby="plan" className="mt-10">
          <h2 id="plan" className="text-lg font-extrabold">요금</h2>
          <div className="mt-4 rounded-3xl bg-[var(--ink)] p-6 text-white shadow-[0_10px_34px_rgba(11,59,60,0.28)]">
            <p className="font-data text-[11px] uppercase tracking-[0.2em] text-white/60">{PLAN.name}</p>
            <p className="mt-2 text-4xl font-extrabold tracking-tight">
              {won(PLAN.monthlyWon)}
              <span className="text-base font-medium text-white/70"> /월</span>
            </p>
            <p className="mt-1 text-sm text-white/80">{PLAN.trialDays}일 무료 체험 · 의사 수 제한 없음 · 환자 앱은 무료</p>
            <p className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-xs leading-relaxed text-white/85">
              금액은 <strong>안(가정)</strong>입니다. 실제 요금은 파일럿 측정치와 변호사 검토 뒤에 정합니다.
              병원이 사는 것은 문진·서류 도구이지, 환자를 보내 주는 대가가 아닙니다 — 특정 병원을
              추천하고 <strong>추천 대가</strong>를 주고받는 일은 하지 않습니다(의료법 27조).
            </p>
          </div>
        </section>

        <section aria-labelledby="trial" className="mt-10">
          <h2 id="trial" className="text-lg font-extrabold">체험 신청</h2>
          <p className="mt-1 text-xs text-[var(--ink-2)]">
            <strong>시연</strong>: 서버가 없어 신청은 이 기기에만 저장되고 아무에게도 전송되지 않습니다.
          </p>
          {done ? (
            <p role="status" className="mt-4 rounded-3xl bg-[var(--surface)] p-5 text-sm leading-relaxed shadow-[0_1px_12px_rgba(11,59,60,0.07)]">
              <strong>{done}</strong> 체험 신청이 이 기기에 저장됐어요. 실제 서비스에서는 담당자가 연락드리고,
              병원 등록 → 직원 배지 발급 순서로 시작합니다.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-4 space-y-3 rounded-3xl bg-[var(--surface)] p-5 shadow-[0_1px_12px_rgba(11,59,60,0.07)]">
              <Field id="t-hospital" label="병원 이름" value={hospital} onChange={setHospital} placeholder="예: 행복의원" />
              <Field id="t-contact" label="담당자" value={contact} onChange={setContact} placeholder="원장·원무 담당자 이름" />
              <Field id="t-phone" label="연락처" value={phone} onChange={setPhone} placeholder="전화 또는 이메일" />
              <button
                type="submit"
                disabled={!ready}
                className="h-12 w-full rounded-2xl bg-[var(--ink)] text-sm font-extrabold text-white transition active:scale-[0.99] disabled:bg-[var(--mist)] disabled:text-[var(--ink-2)]"
              >
                {PLAN.trialDays}일 무료 체험 신청
              </button>
            </form>
          )}
        </section>

        <section className="mt-10 text-xs leading-relaxed text-[var(--ink-2)]">
          <p>
            지금 단계는 시연입니다. 병원 예약·EMR·전자처방·수납 시스템과 연동되기 전이며, 환자 화면과 의사
            화면이 같은 기기 저장소를 쓰는 미리보기입니다. 보안(저장 암호화·병원 인증)은 출시 전에 보완합니다.
          </p>
          <p className="mt-2">
            <Link to="/terms" className="underline">이용약관</Link> · <Link to="/privacy" className="underline">개인정보처리방침</Link>
          </p>
        </section>
      </div>
    </div>
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
