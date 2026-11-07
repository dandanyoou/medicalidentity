import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/**
 * 진료 예약 — 시연(데모) 화면.
 *
 * 중요: 실제 병원 예약 시스템과 연동되어 있지 않다. 병원 EMR·예약 시스템과의
 * 연동은 병원 파트너십이 선결이며, 그 전까지 이 화면은 "이런 흐름이 된다"를
 * 보여주는 시연일 뿐이다 — 가짜로 실제 예약이 되는 척하지 않는다.
 */
const DEMO_HOSPITALS = ["서울대학교병원", "세브란스병원", "서울아산병원", "분당서울대병원"];
const DEMO_DEPTS = ["내과", "정형외과", "신경과", "가정의학과", "안과", "이비인후과"];
const DEMO_SLOTS = ["오늘 15:30", "내일 10:00", "내일 14:00", "모레 09:30"];

export function BookingScreen() {
  useEffect(() => {
    document.title = "진료 예약 (시연) — 가족 의료지갑";
  }, []);

  const [hospital, setHospital] = useState(DEMO_HOSPITALS[0]);
  const [dept, setDept] = useState(DEMO_DEPTS[0]);
  const [slot, setSlot] = useState(DEMO_SLOTS[0]);
  const [booked, setBooked] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--paper)] md:px-6 md:py-10">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-[var(--paper)] md:max-w-xl md:min-h-0 md:overflow-hidden md:rounded-[32px] md:shadow-[0_8px_60px_rgba(11,59,60,0.14)]">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--mist)] bg-[var(--paper)]/92 px-5 py-4 backdrop-blur">
          <Link
            to="/wallet"
            aria-label="지갑으로 돌아가기"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink-2)] hover:bg-[var(--surface)]"
          >
            ‹
          </Link>
          <h1 className="text-base font-extrabold tracking-tight text-[var(--ink)]">
            진료 예약
          </h1>
          <span className="ml-1 rounded-full bg-[var(--ink)] px-2 py-0.5 font-data text-[10px] font-bold text-white">
            시연
          </span>
        </header>

        <main className="flex-1 overflow-y-auto px-5 pb-10 pt-5">
          <p className="mb-5 rounded-2xl border-l-4 border-[var(--ink)] bg-[var(--surface)] px-4 py-3 text-xs leading-relaxed text-[var(--ink-2)]">
            <strong className="text-[var(--ink)]">실제 병원 연동이 아닙니다.</strong> 병원
            예약 시스템과 연동되면 이 자리에 실제 예약이 들어옵니다. 지금은 흐름을 보여주는
            시연 화면이에요.
          </p>

          {booked ? (
            <section className="animate-reveal-in rounded-[28px] bg-[var(--surface)] p-6 text-center shadow-[0_2px_24px_rgba(11,59,60,0.09)]">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--refund)]/12 text-2xl">
                ✓
              </div>
              <p className="text-lg font-extrabold text-[var(--ink)]">예약 완료 (시연)</p>
              <p className="mt-2 font-data text-sm text-[var(--ink-2)]">
                {hospital} · {dept}
              </p>
              <p className="font-data text-sm font-bold text-[var(--ink)]">{slot}</p>
              <p className="mt-3 text-[11px] leading-relaxed text-[var(--ink-2)]">
                실제 서비스에서는 병원에서 예약이 확정되고 알림톡으로 안내됩니다.
              </p>
              <button
                type="button"
                onClick={() => setBooked(false)}
                className="mt-4 w-full rounded-2xl border border-[var(--mist)] py-3 text-sm font-bold text-[var(--ink-2)] active:bg-[var(--paper)]"
              >
                다시 예약
              </button>
            </section>
          ) : (
            <div className="flex flex-col gap-4">
              <Field label="병원">
                <Picker options={DEMO_HOSPITALS} value={hospital} onChange={setHospital} />
              </Field>
              <Field label="진료과">
                <Picker options={DEMO_DEPTS} value={dept} onChange={setDept} />
              </Field>
              <Field label="시간">
                <Picker options={DEMO_SLOTS} value={slot} onChange={setSlot} />
              </Field>

              <button
                type="button"
                onClick={() => setBooked(true)}
                className="mt-1 w-full rounded-2xl bg-[var(--ink)] py-3.5 text-base font-bold text-white active:brightness-110"
              >
                예약하기 (시연)
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 px-1 text-sm font-bold text-[var(--ink)]">{label}</div>
      {children}
    </div>
  );
}

function Picker({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          aria-pressed={value === o}
          className={`rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition ${
            value === o
              ? "bg-[var(--ink)] text-white"
              : "border border-[var(--mist)] bg-[var(--surface)] text-[var(--ink-2)]"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
