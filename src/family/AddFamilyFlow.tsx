import { useState } from "react";
import { Stepper } from "../shell/Stepper";
import type { FamilyMember, Relation } from "./store";
import {
  PROOF_LABEL,
  isValidDocNumber,
  maskDocNumber,
  isValidMobile,
  normalizePhone,
  maskPhone,
  lookupServiceUser,
  isDuplicatePhone,
  type ProofMethod,
} from "./verify";

/**
 * 가족 추가 — 증명서 확인 → 가족 정보 → 회원 확인 → 추가.
 * 증명 없이 아무나 가족으로 등록하지 못하게 한다. 진위확인·문자 인증은 시연.
 */
const STEPS = [{ label: "증명서" }, { label: "가족 정보" }, { label: "회원 확인" }, { label: "추가" }];
const RELATIONS: Relation[] = ["부모", "배우자", "자녀", "형제", "기타"];
const BLOODS = ["A", "B", "O", "AB"];

export type NewMember = Omit<FamilyMember, "id" | "isSelf">;

export function AddFamilyFlow({
  members,
  onAdd,
}: {
  members: FamilyMember[];
  onAdd: (m: NewMember) => void;
}) {
  const [step, setStep] = useState(0);

  // 1. 증명서
  const [method, setMethod] = useState<ProofMethod | null>(null);
  const [docNumber, setDocNumber] = useState("");
  const [photoName, setPhotoName] = useState<string | null>(null);

  // 2. 가족 정보
  const [name, setName] = useState("");
  const [relation, setRelation] = useState<Relation>("부모");
  const [phone, setPhone] = useState("");
  const [listed, setListed] = useState(false);
  // 당사자 동의 — 남의 건강 정보(민감정보)를 대신 등록하는 것이라 확인을 받는다.
  const [consented, setConsented] = useState(false);

  // 4. 의료 정보
  const [blood, setBlood] = useState("A");
  const [rh, setRh] = useState<"+" | "-">("+");
  const [allergen, setAllergen] = useState("");
  const [medsText, setMedsText] = useState("");

  const proofOk =
    method === "family-cert" ? isValidDocNumber(docNumber) : method === "resident-register" ? !!photoName : false;
  const phoneValid = isValidMobile(phone);
  const duplicate = phoneValid && isDuplicatePhone(phone, members);
  const personOk = name.trim().length > 0 && phoneValid && !duplicate && listed && consented;
  const lookup = step >= 2 ? lookupServiceUser(name, phone) : null;

  function finish() {
    const member = lookup?.status === "member" ? lookup.user : null;
    onAdd({
      name: name.trim(),
      relation,
      blood,
      rh,
      allergen: allergen.trim() || undefined,
      meds: medsText
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean),
      phone: normalizePhone(phone),
      verification: {
        method: method!,
        docRef: method === "family-cert" ? maskDocNumber(docNumber) : undefined,
        verifiedAt: Date.now(),
      },
      link: member ? { status: "연결 요청됨", userId: member.userId } : { status: "관리 프로필" },
    });
  }

  return (
    <div>
      <div className="mb-4">
        <Stepper steps={STEPS} current={step} />
      </div>

      {step === 0 && (
        <div>
          <p className="mb-3 text-sm leading-relaxed text-[var(--ink-2)]">
            가족임을 확인할 서류를 골라 주세요. 서류에 적힌 가족만 추가할 수 있어요.
          </p>
          <div className="mb-4 flex flex-col gap-2">
            {(Object.keys(PROOF_LABEL) as ProofMethod[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                aria-pressed={method === m}
                className={`rounded-2xl px-4 py-3 text-left transition ${
                  method === m
                    ? "bg-[var(--ink)] text-white"
                    : "border border-[var(--mist)] bg-[var(--paper)] text-[var(--ink)]"
                }`}
              >
                <span className="block text-sm font-bold">{PROOF_LABEL[m]}</span>
                <span className={`mt-0.5 block text-xs ${method === m ? "text-white/75" : "text-[var(--ink-2)]"}`}>
                  {m === "family-cert" ? "정부24·전자가족관계등록에서 받은 증명서" : "주민센터에서 뗀 등본을 사진으로"}
                </span>
              </button>
            ))}
          </div>

          {method === "family-cert" && (
            <label className="mb-2 block">
              <span className="mb-1 block text-xs font-semibold text-[var(--ink-2)]">문서확인번호</span>
              <input
                aria-label="문서확인번호"
                inputMode="numeric"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder="0000-0000-0000-0000"
                className="w-full rounded-xl border border-[var(--mist)] bg-[var(--paper)] px-3 py-2.5 font-data text-sm text-[var(--ink)] outline-none focus:border-[var(--ink)]"
              />
              <span className="mt-1 block text-xs leading-relaxed text-[var(--ink-2)]">
                증명서 하단의 16자리 번호예요. 기관 진위확인은 연동 전 시연이라 지금은 형식만 확인해요.
              </span>
            </label>
          )}

          {method === "resident-register" && (
            <label className="mb-2 block">
              <span className="mb-1 block text-xs font-semibold text-[var(--ink-2)]">등본 사진</span>
              <input
                aria-label="등본 사진 첨부"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? null)}
                className="w-full rounded-xl border border-dashed border-[var(--mist)] bg-[var(--paper)] px-3 py-3 text-sm text-[var(--ink-2)]"
              />
              <span className="mt-1 block text-xs leading-relaxed text-[var(--ink-2)]">
                {photoName ? `첨부됨: ${photoName} · ` : ""}주민등록번호 뒷자리는 가리고 찍어 주세요. 사진은
                저장하지 않고 확인에만 써요.
              </span>
            </label>
          )}

          <NextButton disabled={!proofOk} onClick={() => setStep(1)} />
        </div>
      )}

      {step === 1 && (
        <div>
          <p className="mb-3 text-sm leading-relaxed text-[var(--ink-2)]">
            {method ? PROOF_LABEL[method] : "증명서"}에 적힌 그대로 입력해 주세요.
          </p>
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-semibold text-[var(--ink-2)]">성함</span>
            <input
              aria-label="성함"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="증명서에 적힌 성함"
              className="w-full rounded-xl border border-[var(--mist)] bg-[var(--paper)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--ink)]"
            />
          </label>
          <ChipRow label="관계">
            {RELATIONS.map((r) => (
              <Chip key={r} active={relation === r} onClick={() => setRelation(r)}>
                {r}
              </Chip>
            ))}
          </ChipRow>
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-semibold text-[var(--ink-2)]">연락처</span>
            <input
              aria-label="연락처"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              className="w-full rounded-xl border border-[var(--mist)] bg-[var(--paper)] px-3 py-2.5 font-data text-sm text-[var(--ink)] outline-none focus:border-[var(--ink)]"
            />
            {phone.length > 0 && !phoneValid && (
              <span className="mt-1 block text-xs text-[var(--vital-ink)]">휴대폰 번호 형식을 확인해 주세요.</span>
            )}
            {duplicate && (
              <span className="mt-1 block text-xs text-[var(--vital-ink)]">이미 가족에 등록된 연락처예요.</span>
            )}
          </label>
          <label className="mb-4 flex items-start gap-2 rounded-xl bg-[var(--paper)] px-3 py-3 text-sm text-[var(--ink)]">
            <input
              type="checkbox"
              checked={listed}
              onChange={(e) => setListed(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-none accent-[var(--ink)]"
            />
            <span>증명서에 이 가족이 기재되어 있어요</span>
          </label>
          <label className="mb-4 flex items-start gap-2 rounded-xl bg-[var(--paper)] px-3 py-3 text-sm text-[var(--ink)]">
            <input
              type="checkbox"
              checked={consented}
              onChange={(e) => setConsented(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-none accent-[var(--ink)]"
            />
            <span>
              이 가족에게 건강 정보를 대신 기록하는 것에 대해 동의를 받았어요
              <span className="mt-0.5 block text-[11px] text-[var(--ink-2)]">
                남의 건강 정보라 본인 동의가 필요해요. 만 14세 미만 자녀는 보호자로서 동의해요.
              </span>
            </span>
          </label>
          <div className="flex gap-2">
            <BackButton onClick={() => setStep(0)} />
            <NextButton disabled={!personOk} onClick={() => setStep(2)} />
          </div>
        </div>
      )}

      {step === 2 && lookup && (
        <div>
          {lookup.status === "member" && (
            <div className="mb-4 rounded-2xl bg-[var(--refund)]/10 px-4 py-4">
              <p className="text-sm font-bold text-[var(--refund-ink)]">가족 의료지갑 회원이에요</p>
              <p className="mt-2 text-sm font-bold text-[var(--ink)]">{lookup.user.name}</p>
              <p className="font-data text-xs text-[var(--ink-2)]">{maskPhone(lookup.user.phone)}</p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--ink-2)]">
                증명서 성함과 회원 이름이 같아요. 추가하면 상대에게 연결 요청이 가고, 수락하면 서로의
                응급 정보를 볼 수 있어요. 알림 발송은 연동 전 시연이에요.
              </p>
            </div>
          )}
          {lookup.status === "not-member" && (
            <div className="mb-4 rounded-2xl bg-[var(--paper)] px-4 py-4">
              <p className="text-sm font-bold text-[var(--ink)]">아직 가족 의료지갑 회원이 아니에요</p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--ink-2)]">
                보호자가 대신 관리하는 프로필로 추가해요. 나중에 가족이 가입하면 연결할 수 있어요. 초대
                문자는 연동 전 시연이에요.
              </p>
            </div>
          )}
          {lookup.status === "name-mismatch" && (
            <div role="alert" className="mb-4 rounded-2xl bg-[var(--vital)]/10 px-4 py-4">
              <p className="text-sm font-bold text-[var(--vital-ink)]">연락처의 회원 이름이 증명서와 달라요</p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--ink-2)]">
                이 연락처로 가입한 회원의 이름이 증명서 성함과 같지 않아 추가할 수 없어요. 성함과 연락처를
                다시 확인해 주세요.
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <BackButton onClick={() => setStep(1)} label={lookup.status === "name-mismatch" ? "정보 다시 입력" : "이전"} />
            {lookup.status !== "name-mismatch" && (
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 rounded-2xl bg-[var(--ink)] py-3.5 text-base font-bold text-white active:brightness-110"
              >
                {lookup.status === "member" ? "연결 요청하고 계속" : "관리 프로필로 계속"}
              </button>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="mb-4 rounded-2xl bg-[var(--paper)] px-4 py-3">
            <p className="text-sm font-bold text-[var(--ink)]">
              {name.trim()} <span className="text-xs font-semibold text-[var(--ink-2)]">{relation}</span>
            </p>
            <p className="font-data text-xs text-[var(--ink-2)]">
              {maskPhone(phone)} · {method ? PROOF_LABEL[method] : ""} 확인
            </p>
          </div>
          <p className="mb-2 text-xs font-semibold text-[var(--ink-2)]">응급 시 보여줄 의료 정보</p>
          <ChipRow label="혈액형">
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
          </ChipRow>
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
          <div className="flex gap-2">
            <BackButton onClick={() => setStep(2)} />
            <button
              type="button"
              onClick={finish}
              className="flex-1 rounded-2xl bg-[var(--ink)] py-3.5 text-base font-bold text-white active:brightness-110"
            >
              추가하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NextButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex-1 w-full rounded-2xl bg-[var(--ink)] py-3.5 text-base font-bold text-white active:brightness-110 disabled:bg-[var(--mist)] disabled:text-[var(--ink-2)]"
    >
      다음
    </button>
  );
}

function BackButton({ onClick, label = "이전" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-none rounded-2xl border border-[var(--mist)] px-4 py-3.5 text-sm font-bold text-[var(--ink-2)] active:bg-[var(--paper)]"
    >
      {label}
    </button>
  );
}

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
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
      className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
        active ? "bg-[var(--ink)] text-white" : "border border-[var(--mist)] bg-[var(--surface)] text-[var(--ink-2)]"
      }`}
    >
      {children}
    </button>
  );
}
