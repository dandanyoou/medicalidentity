import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listMembers, addMember, removeMember, SELF_ID, type FamilyMember } from "./store";
import { isPremium } from "../subscribe/plan";
import { BottomSheet } from "../shell/BottomSheet";
import { AddFamilyFlow, type NewMember } from "./AddFamilyFlow";
import { PROOF_LABEL, maskPhone } from "./verify";

const FREE_LIMIT = 3; // 본인 포함 무료 3명까지, 이상은 프리미엄

/**
 * 가족 관리 — 보호자가 부모·배우자·자녀의 의료 프로필을 등록/관리한다.
 * 노인이 앱을 직접 쓰지 않아도 되게, 자녀가 가족의 응급 의료정보를 대신 챙긴다.
 *
 * 가족 추가는 증명서 확인 → 가족 정보 → 회원 확인 → 추가 순서(AddFamilyFlow).
 * 증명 없이 아무나 '내 가족'으로 등록하지 못하게 한다.
 */

// 관계별 아바타 색 — 본인은 잉크, 가족은 따뜻한/차가운 톤으로 구분.
const AVATAR_BG: Record<string, string> = {
  본인: "bg-[var(--ink)] text-white",
  부모: "bg-[#f3e2c7] text-[#7a4b12]",
  배우자: "bg-[#ffd9d4] text-[var(--vital-ink)]",
  자녀: "bg-[#d2f1e4] text-[var(--refund-ink)]",
  형제: "bg-[#dbe7f5] text-[#1f4c7a]",
  기타: "bg-[var(--mist)] text-[var(--ink-2)]",
};

export function FamilyScreen() {
  useEffect(() => {
    document.title = "가족 관리 — 가족 의료지갑";
  }, []);

  const [members, setMembers] = useState<FamilyMember[]>(() => listMembers());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [gated, setGated] = useState(false);

  const premium = isPremium();
  const family = members.filter((m) => m.id !== SELF_ID);

  function openSheet() {
    if (!premium && members.length >= FREE_LIMIT) {
      setGated(true);
      return;
    }
    setSheetOpen(true);
  }

  function handleAdd(input: NewMember) {
    if (!premium && members.length >= FREE_LIMIT) {
      setSheetOpen(false);
      setGated(true);
      return;
    }
    addMember(input);
    setMembers(listMembers());
    setSheetOpen(false);
  }

  function handleRemove(id: string) {
    removeMember(id);
    setMembers(listMembers());
    setGated(false);
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] md:px-6 md:py-10">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-[var(--paper)] md:max-w-xl md:min-h-0 md:overflow-hidden md:rounded-[32px] md:shadow-[0_8px_60px_rgba(11,59,60,0.14)]">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--mist)] bg-[var(--paper)]/92 px-5 py-4 backdrop-blur">
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-[var(--ink)]">우리 가족</h1>
            <p className="font-data text-[11px] text-[var(--ink-2)]">
              {premium ? `${members.length}명 · 프리미엄 무제한` : `${members.length}명 · 무료 ${FREE_LIMIT}명까지`}
            </p>
          </div>
          <button
            type="button"
            onClick={openSheet}
            className="flex-none rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-bold text-white shadow-[0_6px_18px_rgba(11,59,60,0.25)] active:brightness-110"
          >
            가족 추가
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-5 pb-10 pt-5">
          <div className="flex flex-col gap-3">
            {members.map((m) => (
              <MemberCard key={m.id} member={m} onRemove={() => handleRemove(m.id)} />
            ))}
          </div>

          {family.length === 0 && (
            <div className="mt-4 rounded-3xl border border-dashed border-[var(--mist)] bg-[var(--surface)]/60 px-5 py-7 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--paper)] font-data text-xl font-bold text-[var(--ink-2)]">
                +
              </div>
              <p className="text-sm font-bold text-[var(--ink)]">아직 등록된 가족이 없어요</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--ink-2)]">
                가족관계증명서나 등본으로 가족임을 확인한 뒤 등록해요. 부모님 혈액형·알레르기·복용약을
                미리 넣어 두면 응급 시 의료진에게 바로 보여줄 수 있어요.
              </p>
              <button
                type="button"
                onClick={openSheet}
                className="mt-4 rounded-2xl bg-[var(--ink)] px-5 py-2.5 text-sm font-bold text-white active:brightness-110"
              >
                부모님부터 추가하기
              </button>
            </div>
          )}

          {gated && (
            <Link
              to="/subscribe"
              className="mt-4 block rounded-2xl border-l-4 border-[var(--refund)] bg-[var(--surface)] px-4 py-3 shadow-[0_1px_12px_rgba(11,59,60,0.07)]"
            >
              <p className="text-sm font-bold text-[var(--ink)]">무료는 {FREE_LIMIT}명까지예요</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--ink-2)]">
                가족 프리미엄(월 3,900원)으로 바꾸면 가족을 무제한 등록할 수 있어요.{" "}
                <span className="font-bold text-[var(--refund-ink)]">구독하기 →</span>
              </p>
            </Link>
          )}

          {family.length > 0 && (
            <p className="mt-5 px-1 text-[11px] leading-relaxed text-[var(--ink-2)]">
              가족 프로필은 이 기기에만 저장돼요. 증명서 원본·사진과 주민등록번호는 저장하지 않아요. 실제
              응급 QR(SD-JWT 서명)은 본인 프로필에서만 생성되고, 가족 발급은 병원·기관 연동 후 열려요.
            </p>
          )}
        </main>

        <BottomSheet open={sheetOpen} title="가족 추가" onClose={() => setSheetOpen(false)}>
          <AddFamilyFlow members={members} onAdd={handleAdd} />
        </BottomSheet>
      </div>
    </div>
  );
}

function MemberCard({ member: m, onRemove }: { member: FamilyMember; onRemove: () => void }) {
  const self = m.id === SELF_ID;
  const avatar = AVATAR_BG[m.relation] ?? AVATAR_BG.기타;
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-[var(--surface)] px-4 py-3.5 shadow-[0_1px_12px_rgba(11,59,60,0.07)]">
      <div
        aria-hidden="true"
        className={`flex h-11 w-11 flex-none items-center justify-center rounded-full text-base font-extrabold ${avatar}`}
      >
        {m.name.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-[var(--ink)]">
          <span className="truncate">{m.name}</span>
          <span
            className={`flex-none rounded-full px-2 py-0.5 font-data text-[10px] font-bold ${
              self ? "bg-[var(--ink)] text-white" : "bg-[var(--paper)] text-[var(--ink-2)]"
            }`}
          >
            {m.relation}
          </span>
          {m.link && (
            <span
              className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-bold ${
                m.link.status === "연결 요청됨"
                  ? "bg-[var(--refund)]/12 text-[var(--refund-ink)]"
                  : "bg-[var(--paper)] text-[var(--ink-2)]"
              }`}
            >
              {m.link.status}
            </span>
          )}
        </p>
        <p className="mt-0.5 truncate font-data text-[11px] text-[var(--ink-2)]">
          <span className="font-bold text-[var(--vital-ink)]">
            {m.blood}
            {m.rh}
          </span>
          {m.allergen ? ` · ${m.allergen}` : " · 알레르기 없음"}
          {m.meds && m.meds.length > 0 ? ` · ${m.meds.join(", ")}` : ""}
        </p>
        {m.verification && (
          <p className="mt-0.5 truncate text-[11px] text-[var(--ink-2)]">
            ✓ {PROOF_LABEL[m.verification.method]} 확인{m.phone ? ` · ${maskPhone(m.phone)}` : ""}
          </p>
        )}
      </div>
      {!self && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${m.name} 삭제`}
          className="flex-none rounded-full px-3 py-2 text-xs font-semibold text-[var(--ink-2)] active:bg-[var(--paper)]"
        >
          삭제
        </button>
      )}
    </div>
  );
}
