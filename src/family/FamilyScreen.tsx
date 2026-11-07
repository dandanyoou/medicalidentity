import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  listMembers,
  addMember,
  removeMember,
  SELF_ID,
  type Relation,
  type FamilyMember,
} from "./store";

/**
 * 가족 관리 — 보호자가 부모·배우자·자녀의 의료 프로필을 등록/관리한다.
 * 노인이 앱을 직접 쓰지 않아도 되게, 자녀가 가족의 응급 의료정보를 대신 챙긴다.
 */
const RELATIONS: Relation[] = ["부모", "배우자", "자녀", "형제", "기타"];
const BLOODS = ["A", "B", "O", "AB"];

export function FamilyScreen() {
  useEffect(() => {
    document.title = "가족 관리 — 가족 의료지갑";
  }, []);

  const [members, setMembers] = useState<FamilyMember[]>(() => listMembers());
  const [name, setName] = useState("");
  const [relation, setRelation] = useState<Relation>("부모");
  const [blood, setBlood] = useState("A");
  const [rh, setRh] = useState<"+" | "-">("+");
  const [allergen, setAllergen] = useState("");
  const [medsText, setMedsText] = useState("");

  function handleAdd() {
    if (!name.trim()) return;
    addMember({
      name: name.trim(),
      relation,
      blood,
      rh,
      allergen: allergen.trim() || undefined,
      meds: medsText
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean),
    });
    setMembers(listMembers());
    setName("");
    setAllergen("");
    setMedsText("");
  }

  function handleRemove(id: string) {
    removeMember(id);
    setMembers(listMembers());
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
            가족 관리
          </h1>
        </header>

        <main className="flex-1 overflow-y-auto px-5 pb-10 pt-5">
          <p className="mb-5 rounded-2xl border-l-4 border-[var(--vital)] bg-[var(--surface)] px-4 py-3 text-xs leading-relaxed text-[var(--ink-2)]">
            부모님·가족의 혈액형·알레르기·복용약을 미리 등록해 두면, 응급 시 의료진에게
            바로 보여줄 수 있어요. 가족이 앱을 직접 쓰지 않아도 됩니다.
          </p>

          <div className="mb-6 flex flex-col gap-3">
            {members.map((m) => (
              <div
                key={m.id}
                className="relative overflow-hidden rounded-3xl bg-[var(--surface)] p-4 pl-5 shadow-[0_1px_12px_rgba(11,59,60,0.07)]"
              >
                <div className="absolute inset-y-0 left-0 w-1 bg-[var(--vital)]" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[var(--ink)]">
                      {m.name}
                      <span className="ml-1.5 text-xs font-medium text-[var(--ink-2)]">
                        {m.relation}
                      </span>
                    </p>
                    <p className="mt-0.5 font-data text-[11px] text-[var(--ink-2)]">
                      {m.blood}
                      {m.rh}
                      {m.allergen ? ` · ${m.allergen}` : ""}
                      {m.meds && m.meds.length > 0 ? ` · ${m.meds.join(", ")}` : ""}
                    </p>
                  </div>
                  {m.id !== SELF_ID && (
                    <button
                      type="button"
                      onClick={() => handleRemove(m.id)}
                      aria-label={`${m.name} 삭제`}
                      className="text-xs font-semibold text-[var(--ink-2)] underline"
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <section className="rounded-[28px] bg-[var(--surface)] p-5 shadow-[0_2px_24px_rgba(11,59,60,0.09)]">
            <h2 className="mb-4 text-sm font-extrabold text-[var(--ink)]">가족 추가</h2>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름"
              className="mb-3 w-full rounded-xl border border-[var(--mist)] bg-[var(--paper)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--ink)]"
            />

            <Row label="관계">
              {RELATIONS.map((r) => (
                <Chip key={r} active={relation === r} onClick={() => setRelation(r)}>
                  {r}
                </Chip>
              ))}
            </Row>

            <Row label="혈액형">
              {BLOODS.map((b) => (
                <Chip key={b} active={blood === b} onClick={() => setBlood(b)}>
                  {b}
                </Chip>
              ))}
              {(["+", "-"] as const).map((r) => (
                <Chip key={r} active={rh === r} onClick={() => setRh(r)}>
                  Rh{r}
                </Chip>
              ))}
            </Row>

            <input
              value={allergen}
              onChange={(e) => setAllergen(e.target.value)}
              placeholder="알레르기 (예: 페니실린)"
              className="mb-3 w-full rounded-xl border border-[var(--mist)] bg-[var(--paper)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--ink)]"
            />
            <input
              value={medsText}
              onChange={(e) => setMedsText(e.target.value)}
              placeholder="복용약 (쉼표로 구분, 예: 와파린, 메트포르민)"
              className="mb-4 w-full rounded-xl border border-[var(--mist)] bg-[var(--paper)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--ink)]"
            />

            <button
              type="button"
              onClick={handleAdd}
              className="w-full rounded-2xl bg-[var(--ink)] py-3.5 text-base font-bold text-white active:brightness-110"
            >
              가족 추가
            </button>
          </section>
        </main>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 text-xs font-semibold text-[var(--ink-2)]">{label}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
        active
          ? "bg-[var(--ink)] text-white"
          : "border border-[var(--mist)] bg-[var(--surface)] text-[var(--ink-2)]"
      }`}
    >
      {children}
    </button>
  );
}
