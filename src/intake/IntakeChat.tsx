import { useEffect, useState } from "react";
import {
  EMPTY_ANSWERS,
  answer,
  currentQuestion,
  guessParts,
  summarize,
  undo,
  type IntakeAnswers,
  type IntakeOption,
  type IntakeQuestion,
} from "./engine";

interface Turn {
  prompt: string;
  reply: string;
}

interface Props {
  /** 환자가 먼저 적어둔 문장 — 부위를 미리 골라두는 데만 쓴다. */
  seedText: string;
  onDone: (answers: IntakeAnswers, summary: string) => void;
  /** 문진 화면이 처음 열릴 때 — 소요 시간 측정용(병원 대시보드). */
  onStart?: () => void;
  onReset?: () => void;
}

/**
 * 대화로 증상 정리 — 한 번에 한 질문, 누르는 답.
 * 진단하지 않는다. 고른 답을 의사에게 전달할 문장으로 옮길 뿐이다.
 */
export function IntakeChat({ seedText, onDone, onReset, onStart }: Props) {
  const [answers, setAnswers] = useState<IntakeAnswers>(EMPTY_ANSWERS);
  const [turns, setTurns] = useState<Turn[]>([]);
  const question = currentQuestion(answers);

  // 문진이 열린 시각 — 마운트 때 한 번.
  useEffect(() => {
    onStart?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(q: IntakeQuestion, value: string | number | string[], reply: string) {
    const next = answer(answers, value);
    setAnswers(next);
    setTurns((t) => [...t, { prompt: q.prompt, reply }]);
    if (!currentQuestion(next)) onDone(next, summarize(next));
  }

  function back() {
    setAnswers((a) => undo(a));
    setTurns((t) => t.slice(0, -1));
  }

  function restart() {
    setAnswers(EMPTY_ANSWERS);
    setTurns([]);
    onReset?.();
  }

  return (
    <section
      aria-label="대화로 증상 정리"
      className="rounded-3xl bg-[var(--surface)] p-4 shadow-[0_1px_12px_rgba(11,59,60,0.07)]"
    >
      <p className="mb-3 text-[11px] leading-relaxed text-[var(--ink-2)]">
        말로 설명하기 어려워도 괜찮아요. 눌러서 답하면 의사에게 전달할 문장으로 정리해 드려요.
        진단이 아니라 증상을 정리해서 전달하는 문진이에요.
      </p>

      {/* 카드 속 카드 — 지나간 대화는 paper 면 안쪽 카드에 말풍선으로(질문=흰 카드, 내 답=잉크). */}
      <div
        role="log"
        aria-label="문진 대화 기록"
        className={`flex flex-col gap-2 rounded-2xl bg-[var(--paper)] ${turns.length > 0 ? "p-3" : ""}`}
      >
        {turns.map((t, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Bubble from="bot">{t.prompt}</Bubble>
            <Bubble from="me">{t.reply}</Bubble>
          </div>
        ))}
      </div>

      {question ? (
        <QuestionCard
          key={question.step === "parts" ? `parts-${seedText}` : `${question.step}-${question.part ?? ""}`}
          question={question}
          initialSelected={question.step === "parts" ? guessParts(seedText) : []}
          onSubmit={submit}
          onBack={turns.length > 0 ? back : undefined}
        />
      ) : (
        <div className="mt-3 animate-reveal-in rounded-2xl bg-[var(--paper)] px-4 py-3">
          <p className="mb-1 text-[11px] font-semibold text-[var(--ink-2)]">정리된 증상</p>
          <p className="text-sm leading-relaxed text-[var(--ink)]">{summarize(answers)}</p>
          <div className="mt-3 flex items-center gap-2">
            <BackButton onClick={back} />
            <button
              type="button"
              onClick={restart}
              className="flex min-h-[44px] items-center rounded-full border border-[var(--mist)] bg-[var(--surface)] px-4 text-xs font-bold text-[var(--ink-2)] active:bg-[var(--mist)]"
            >
              처음부터 다시
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Bubble({ from, children }: { from: "bot" | "me"; children: React.ReactNode }) {
  return (
    <p
      className={
        from === "bot"
          ? "max-w-[85%] self-start rounded-2xl rounded-tl-md border border-[var(--mist)] bg-[var(--surface)] px-3.5 py-2 text-sm text-[var(--ink)]"
          : "max-w-[85%] self-end rounded-2xl rounded-tr-md bg-[var(--ink)] px-3.5 py-2 text-sm font-semibold text-white"
      }
    >
      {children}
    </p>
  );
}

/** 원형 아이콘 버튼(44px) — 이름은 "이전 질문으로" 그대로(스크린리더·기존 테스트). */
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="이전 질문으로"
      title="이전 질문으로"
      className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-[var(--mist)] bg-[var(--surface)] text-[var(--ink)] active:bg-[var(--mist)]"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function QuestionCard({
  question,
  initialSelected,
  onSubmit,
  onBack,
}: {
  question: IntakeQuestion;
  initialSelected: string[];
  onSubmit: (q: IntakeQuestion, value: string | number | string[], reply: string) => void;
  onBack?: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(initialSelected);

  function toggle(o: IntakeOption) {
    const v = String(o.value);
    setSelected((cur) => {
      if (cur.includes(v)) return cur.filter((x) => x !== v);
      if (o.exclusive) return [v];
      const exclusive = question.options.filter((x) => x.exclusive).map((x) => String(x.value));
      return [...cur.filter((x) => !exclusive.includes(x)), v];
    });
  }

  function submitMulti() {
    // 화면 순서대로 정리해서 넘긴다.
    const ordered = question.options.map((o) => String(o.value)).filter((v) => selected.includes(v));
    const labels = question.options.filter((o) => ordered.includes(String(o.value))).map((o) => o.label);
    onSubmit(question, ordered, labels.join(", "));
  }

  return (
    <div role="group" aria-label="지금 질문" className="mt-3 rounded-2xl bg-[var(--paper)] p-3">
      <Bubble from="bot">{question.prompt}</Bubble>
      <div className="mt-2 flex flex-wrap gap-2">
        {question.options.map((o) => {
          const on = selected.includes(String(o.value));
          return (
            <button
              key={String(o.value)}
              type="button"
              aria-pressed={question.multi ? on : undefined}
              onClick={() => (question.multi ? toggle(o) : onSubmit(question, o.value, o.label))}
              className={`flex min-h-[44px] flex-col items-start justify-center rounded-2xl px-3.5 py-2 text-left transition ${
                on
                  ? "bg-[var(--ink)] text-white"
                  : "border border-[var(--mist)] bg-[var(--surface)] text-[var(--ink)] active:bg-[var(--mist)]"
              }`}
            >
              <span className="text-sm font-bold">{o.label}</span>
              {o.hint && (
                <span className={`text-[11px] ${on ? "text-white/80" : "text-[var(--ink-2)]"}`}>
                  {o.hint}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {/* 대화 입력 알약 규칙 — 왼쪽 원형(뒤로), 오른쪽 잉크색 주 행동(다음). */}
      {(question.multi || onBack) && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <div>{onBack && <BackButton onClick={onBack} />}</div>
          {question.multi && (
            <button
              type="button"
              disabled={selected.length === 0}
              onClick={submitMulti}
              className="min-h-[44px] rounded-full bg-[var(--ink)] px-6 text-sm font-extrabold text-white transition active:scale-[0.98] disabled:bg-[var(--mist)] disabled:text-[var(--ink-2)]"
            >
              다음
            </button>
          )}
        </div>
      )}
    </div>
  );
}
