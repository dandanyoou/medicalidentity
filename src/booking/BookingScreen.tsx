import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { searchSymptoms } from "../symptom-info/data";
import { addVisit } from "../visits/store";

/**
 * 진료 예약 — 증상에서 출발하는 파이프라인.
 *
 *   어디가 아픈지 입력  →  추천 진료과  →  병원 선택  →  시간  →  예약
 *
 * "어느 과/어느 병원에 가야 하지?"를 증상에서 바로 풀어준다(기존 증상 엔진 재사용).
 * 예약하면 지갑의 진료기록(Visit)으로 저장돼 수납·기록과 이어진다.
 *
 * 정직: 실제 병원 예약 시스템과 연동되어 있지 않다(시연). 다만 예약 '의도'는
 * 진료기록에 실제로 저장된다 — 병원 연동이 생기면 이 자리에 실제 예약이 들어온다.
 */
const DEMO_HOSPITALS = [
  "서울대학교병원",
  "세브란스병원",
  "서울아산병원",
  "분당서울대병원",
];
const ALL_DEPTS = ["내과", "가정의학과", "정형외과", "신경과", "안과", "이비인후과", "소화기내과", "피부과"];
const DEMO_SLOTS = ["오늘 15:30", "내일 10:00", "내일 14:00", "모레 09:30"];
const MEMBER = "self";

type Step = "symptom" | "hospital" | "time" | "done";

function slotToDate(slot: string): string {
  const d = new Date();
  if (slot.startsWith("내일")) d.setDate(d.getDate() + 1);
  else if (slot.startsWith("모레")) d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
}

export function BookingScreen() {
  useEffect(() => {
    document.title = "진료 예약 (시연) — 가족 의료지갑";
  }, []);

  const [step, setStep] = useState<Step>("symptom");
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState<string | null>(null);
  const [hospital, setHospital] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);

  const matches = useMemo(() => searchSymptoms(query), [query]);
  const recommendedDepts = useMemo(
    () => Array.from(new Set(matches.map((m) => m.mapQuery))),
    [matches],
  );

  function pickDept(d: string) {
    setDept(d);
    setStep("hospital");
  }

  function confirmBooking() {
    if (!dept || !hospital || !slot) return;
    addVisit({
      memberId: MEMBER,
      hospital,
      dept,
      date: slotToDate(slot),
      reason: query.trim() || "직접 선택",
      amount: 0,
      paid: false,
      status: "예약",
    });
    setStep("done");
  }

  function reset() {
    setStep("symptom");
    setQuery("");
    setDept(null);
    setHospital(null);
    setSlot(null);
  }

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
          {step !== "symptom" && step !== "done" && (
            <button
              type="button"
              onClick={() =>
                setStep(step === "time" ? "hospital" : "symptom")
              }
              className="ml-auto text-xs font-semibold text-[var(--ink-2)] underline"
            >
              이전
            </button>
          )}
        </header>

        <main className="flex-1 overflow-y-auto px-5 pb-10 pt-5">
          <p className="mb-5 rounded-2xl border-l-4 border-[var(--ink)] bg-[var(--surface)] px-4 py-3 text-xs leading-relaxed text-[var(--ink-2)]">
            <strong className="text-[var(--ink)]">실제 병원 연동이 아닙니다.</strong> 병원 예약
            시스템과 연동되면 실제 예약이 됩니다. 지금은 시연이며, 예약 내역은 지갑의
            진료기록에 저장돼요.
          </p>

          {step === "symptom" && (
            <div>
              <label className="mb-2 block text-sm font-bold text-[var(--ink)]">
                어디가 아프세요?
              </label>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="예: 3일째 머리가 아프고 속이 메스꺼워요"
                rows={2}
                className="w-full resize-none rounded-2xl border border-[var(--mist)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--ink)]"
              />

              {recommendedDepts.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold text-[var(--ink-2)]">
                    증상에 맞는 추천 진료과 — 눌러서 예약
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recommendedDepts.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => pickDept(d)}
                        className="rounded-2xl bg-[var(--ink)] px-4 py-2.5 text-sm font-bold text-white active:brightness-110"
                      >
                        {d} 예약 →
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {query.trim().length > 0 && recommendedDepts.length === 0 && (
                <p className="mt-3 rounded-2xl bg-[var(--surface)] px-4 py-3 text-xs text-[var(--ink-2)]">
                  등록된 증상에서 진료과를 못 찾았어요. 아래에서 진료과를 직접 골라주세요.
                </p>
              )}

              <div className="mt-6">
                <p className="mb-2 text-xs font-semibold text-[var(--ink-2)]">
                  또는 진료과 직접 선택
                </p>
                <div className="flex flex-wrap gap-2">
                  {ALL_DEPTS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => pickDept(d)}
                      className="rounded-2xl border border-[var(--mist)] bg-[var(--surface)] px-3.5 py-2.5 text-sm font-semibold text-[var(--ink-2)] active:bg-[var(--paper)]"
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === "hospital" && (
            <div>
              <p className="mb-1 font-data text-[11px] text-[var(--ink-2)]">
                {query.trim() ? `${query.trim()} · ` : ""}
                {dept}
              </p>
              <p className="mb-4 text-sm font-bold text-[var(--ink)]">병원 선택</p>
              <div className="flex flex-col gap-2">
                {DEMO_HOSPITALS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => {
                      setHospital(h);
                      setStep("time");
                    }}
                    className="flex items-center justify-between rounded-2xl border border-[var(--mist)] bg-[var(--surface)] px-4 py-3.5 text-left text-sm font-semibold text-[var(--ink)] active:bg-[var(--paper)]"
                  >
                    {h}
                    <span className="text-[var(--ink-2)]">›</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "time" && (
            <div>
              <p className="mb-1 font-data text-[11px] text-[var(--ink-2)]">
                {hospital} · {dept}
              </p>
              <p className="mb-4 text-sm font-bold text-[var(--ink)]">시간 선택</p>
              <div className="mb-5 flex flex-wrap gap-2">
                {DEMO_SLOTS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSlot(s)}
                    aria-pressed={slot === s}
                    className={`rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition ${
                      slot === s
                        ? "bg-[var(--ink)] text-white"
                        : "border border-[var(--mist)] bg-[var(--surface)] text-[var(--ink-2)]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={!slot}
                onClick={confirmBooking}
                className="w-full rounded-2xl bg-[var(--ink)] py-3.5 text-base font-bold text-white transition active:brightness-110 disabled:bg-[var(--mist)] disabled:text-[var(--ink-2)]"
              >
                예약하기 (시연)
              </button>
            </div>
          )}

          {step === "done" && (
            <section className="animate-reveal-in rounded-[28px] bg-[var(--surface)] p-6 text-center shadow-[0_2px_24px_rgba(11,59,60,0.09)]">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--refund)]/12 text-2xl">
                ✓
              </div>
              <p className="text-lg font-extrabold text-[var(--ink)]">예약 완료 (시연)</p>
              <p className="mt-2 font-data text-sm text-[var(--ink-2)]">
                {hospital} · {dept}
              </p>
              <p className="font-data text-sm font-bold text-[var(--ink)]">{slot}</p>
              {query.trim() && (
                <p className="mt-1 text-xs text-[var(--ink-2)]">사유: {query.trim()}</p>
              )}
              <p className="mt-3 text-[11px] leading-relaxed text-[var(--ink-2)]">
                지갑의 진료기록에 저장됐어요. 실제 서비스에서는 병원에서 예약이 확정되고
                알림톡으로 안내됩니다.
              </p>
              <Link
                to="/billing"
                className="mt-4 block w-full rounded-2xl bg-[var(--ink)] py-3 text-sm font-bold text-white active:brightness-110"
              >
                진료기록에서 보기
              </Link>
              <button
                type="button"
                onClick={reset}
                className="mt-2 w-full rounded-2xl border border-[var(--mist)] py-3 text-sm font-bold text-[var(--ink-2)] active:bg-[var(--paper)]"
              >
                다시 예약
              </button>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
