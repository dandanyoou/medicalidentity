import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { searchSymptoms } from "../symptom-info/data";
import { addVisit } from "../visits/store";
import { Stepper } from "../shell/Stepper";
import { downloadICS, slotToDate, slotToTime } from "./ics";
import { IntakeChat } from "../intake/IntakeChat";
import { HospitalPicker } from "./HospitalPicker";
import { buildRecord, summarize, type IntakeAnswers } from "../intake/engine";
import { checkRedFlags, recommendDepts } from "../intake/triage";

// 예약 진행 단계(상단) · 완료 후 방문 타임라인(완료 카드).
const FLOW_STEPS = [{ label: "증상" }, { label: "병원" }, { label: "시간" }];
const FLOW_INDEX: Record<string, number> = { symptom: 0, hospital: 1, time: 2 };
const VISIT_STEPS = [{ label: "예약" }, { label: "방문" }, { label: "수납" }];

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
const ALL_DEPTS = ["내과", "가정의학과", "정형외과", "신경과", "안과", "이비인후과", "소화기내과", "피부과"];
const DEMO_SLOTS = ["오늘 15:30", "내일 10:00", "내일 14:00", "모레 09:30"];
const MEMBER = "self";

type Step = "symptom" | "hospital" | "time" | "done";

export function BookingScreen() {
  useEffect(() => {
    document.title = "진료 예약 (시연) — 가족 의료지갑";
  }, []);

  // 증상 정보 화면에서 "이 증상으로 예약하기"로 넘어오면 ?q=에 문장이 실려 온다.
  const [params] = useSearchParams();
  const [step, setStep] = useState<Step>("symptom");
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  const [dept, setDept] = useState<string | null>(null);
  const [hospital, setHospital] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  // 대화형 문진 답 — 있으면 정리된 문장이 예약 사유로, 항목별 답은 방문 기록에 함께 간다.
  const [intakeAnswers, setIntakeAnswers] = useState<IntakeAnswers | null>(null);
  const [intakeNote, setIntakeNote] = useState("");
  // 문진 시작 시각 — 병원 대시보드의 "평균 문진 소요"에 쓴다. 기기 밖으로 나가지 않는다.
  const intakeStartRef = useRef<number | null>(null);
  const intakeSummary = intakeAnswers ? summarize(intakeAnswers) : null;

  const matches = useMemo(() => searchSymptoms(query), [query]);
  const reason = intakeSummary ?? query.trim();
  // 문진을 마쳤으면 고른 부위 기준 규칙(여러 증상 처리 포함)으로, 아니면 문장 키워드로 추천한다.
  const intakeRec = useMemo(() => (intakeAnswers ? recommendDepts(intakeAnswers) : null), [intakeAnswers]);
  const redFlag = useMemo(() => (intakeAnswers ? checkRedFlags(intakeAnswers) : null), [intakeAnswers]);
  const recommendedDepts = useMemo(
    () => intakeRec?.depts ?? Array.from(new Set(matches.map((m) => m.mapQuery))),
    [intakeRec, matches],
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
      time: slotToTime(slot).replace(/(\d{2})(\d{2})/, "$1:$2"),
      reason: reason || "직접 선택",
      ...(intakeAnswers
        ? { intake: buildRecord(intakeAnswers, intakeNote, Date.now(), intakeStartRef.current ?? undefined) }
        : {}),
      amount: 0,
      paid: false,
      status: "예약",
    });
    setStep("done");
  }

  function reset() {
    setStep("symptom");
    setQuery("");
    setIntakeAnswers(null);
    setIntakeNote("");
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

          {step !== "done" && (
            <div className="mb-5 rounded-2xl bg-[var(--surface)] px-4 py-3 shadow-[0_1px_12px_rgba(11,59,60,0.07)]">
              <Stepper steps={FLOW_STEPS} current={FLOW_INDEX[step]} />
            </div>
          )}

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

              <div className="mt-4">
                {intakeSummary ? (
                  <div className="rounded-2xl border-l-4 border-[var(--ink)] bg-[var(--surface)] px-4 py-3">
                    <p className="mb-1 text-[11px] font-semibold text-[var(--ink-2)]">
                      정리된 증상 — 예약하면 의사에게 이렇게 전달돼요
                    </p>
                    <p className="text-sm leading-relaxed text-[var(--ink)]">{intakeSummary}</p>
                    <label
                      htmlFor="intake-note"
                      className="mt-3 block text-[11px] font-semibold text-[var(--ink-2)]"
                    >
                      의사에게 더 전하고 싶은 말 (선택)
                    </label>
                    <textarea
                      id="intake-note"
                      value={intakeNote}
                      onChange={(e) => setIntakeNote(e.target.value)}
                      rows={2}
                      maxLength={300}
                      placeholder="예: 약을 먹어도 안 나아요, 예전에도 비슷했어요"
                      className="mt-1 w-full resize-none rounded-xl border border-[var(--mist)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--ink)]"
                    />
                    <button
                      type="button"
                      onClick={() => setIntakeAnswers(null)}
                      className="mt-2 text-xs font-semibold text-[var(--ink-2)] underline"
                    >
                      다시 정리하기
                    </button>
                  </div>
                ) : (
                  <IntakeChat
                    seedText={query}
                    onStart={() => { intakeStartRef.current = Date.now(); }}
                    onDone={(a) => setIntakeAnswers(a)}
                  />
                )}
              </div>

              {redFlag && (
                <div
                  role="alert"
                  className="mt-4 rounded-2xl border-l-4 border-[var(--vital)] bg-[var(--vital)]/8 px-4 py-3"
                >
                  <p className="text-sm font-extrabold text-[var(--vital-ink)]">
                    {redFlag.level === "119"
                      ? "지금 119에 연락하세요"
                      : redFlag.level === "응급실"
                        ? "오늘 응급실 진료가 필요해요"
                        : "오늘 바로 진료를 받으세요"}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--vital-ink)]">{redFlag.message}</p>
                  {redFlag.level === "119" && (
                    <a
                      href="tel:119"
                      className="mt-3 inline-flex min-h-[44px] items-center rounded-2xl bg-[var(--vital)] px-5 text-sm font-bold text-white"
                    >
                      119에 전화하기
                    </a>
                  )}
                  <p className="mt-2 text-[10px] text-[var(--vital-ink)]/80">
                    진단이 아니에요. 고른 답의 조합이 바로 확인이 필요한 경우라 먼저 알려드려요. 이
                    안내는 의료 조언이 아니며, 위급하면 앱과 상관없이 바로 119에 연락하세요.
                  </p>
                </div>
              )}

              {recommendedDepts.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold text-[var(--ink-2)]">
                    증상에 맞는 추천 진료과 — 눌러서 예약
                  </p>
                  {intakeRec && (
                    <p className="mb-2 text-xs leading-relaxed text-[var(--ink)]">{intakeRec.reason}</p>
                  )}
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
              <HospitalPicker
                dept={dept}
                onPick={(name) => {
                  setHospital(name);
                  setStep("time");
                }}
              />
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
              {/* 티켓: 병원·진료과·시각을 한 덩어리로 */}
              <div className="mx-auto mt-4 rounded-2xl bg-[var(--paper)] px-4 py-3 text-left">
                <p className="text-sm font-bold text-[var(--ink)]">{hospital}</p>
                <p className="font-data text-[11px] text-[var(--ink-2)]">{dept}</p>
                <p className="mt-2 font-data text-[28px] font-bold leading-none tracking-tight text-[var(--ink)]">
                  {slot}
                </p>
                {reason && (
                  <p className="mt-2 text-xs text-[var(--ink-2)]">사유: {reason}</p>
                )}
              </div>
              <div className="mt-4">
                <Stepper steps={VISIT_STEPS} current={0} />
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-[var(--ink-2)]">
                지갑의 진료기록에 저장됐어요. 실제 서비스에서는 병원에서 예약이 확정되고
                알림톡으로 안내됩니다.
              </p>
              <button
                type="button"
                onClick={() =>
                  hospital &&
                  dept &&
                  slot &&
                  downloadICS({
                    hospital,
                    dept,
                    date: slotToDate(slot),
                    slot,
                    reason: reason || undefined,
                  })
                }
                className="mt-4 w-full rounded-2xl bg-[var(--ink)] py-3 text-sm font-bold text-white active:brightness-110"
              >
                캘린더에 추가 · {slot ? slotToTime(slot).replace(/(\d{2})(\d{2})/, "$1:$2") : ""}
              </button>
              <Link
                to="/billing"
                className="mt-2 block w-full rounded-2xl border border-[var(--mist)] py-3 text-sm font-bold text-[var(--ink)] active:bg-[var(--paper)]"
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
