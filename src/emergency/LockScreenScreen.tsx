import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SELF_ID, getMember, listMembers } from "../family/store";
import { DEMO_HOLDER } from "../data/issuer-keys";
import { formatPhone } from "../family/verify";
import {
  buildTier1Url,
  medicalIdText,
  renderLockScreenImage,
  tier1Lines,
  type RenderInput,
  type Tier1,
} from "./lockscreen";

/**
 * 응급 잠금화면 만들기 — 폰이 잠겨 있어도, 의식이 없어도 구급대원이 볼 수 있게.
 * 1층 정보만 담고(이름·주민번호 없음), 폰을 본 누구나 읽을 수 있다는 걸 숨기지 않는다.
 */
export function LockScreenScreen({
  renderImage = renderLockScreenImage,
}: {
  /** 테스트 주입용 — 기본은 canvas로 PNG를 그린다. */
  renderImage?: (input: RenderInput) => Promise<string>;
}) {
  useEffect(() => {
    document.title = "응급 잠금화면 — 가족 의료지갑";
  }, []);

  const self = getMember(SELF_ID);
  const contactMember = useMemo(() => listMembers().find((m) => m.id !== SELF_ID && m.phone), []);

  const available = useMemo(() => {
    const blood = self ? `${self.blood}${self.rh}` : undefined;
    const allergens = self?.allergen ? [self.severity ? `${self.allergen}(${self.severity})` : self.allergen] : [];
    const meds = self?.meds ?? [];
    const contact = contactMember?.phone
      ? { label: `${contactMember.relation} ${contactMember.name}`, phone: contactMember.phone }
      : undefined;
    return { blood, allergens, meds, contact };
  }, [self, contactMember]);

  const [useBlood, setUseBlood] = useState(!!available.blood);
  const [useAllergy, setUseAllergy] = useState(available.allergens.length > 0);
  const [useMeds, setUseMeds] = useState(available.meds.length > 0);
  const [useContact, setUseContact] = useState(!!available.contact);

  const t1: Tier1 = useMemo(
    () => ({
      ...(useBlood && available.blood ? { blood: available.blood } : {}),
      ...(useAllergy && available.allergens.length > 0 ? { allergens: available.allergens } : {}),
      ...(useMeds && available.meds.length > 0 ? { meds: available.meds } : {}),
      ...(useContact && available.contact ? { contact: available.contact } : {}),
    }),
    [useBlood, useAllergy, useMeds, useContact, available],
  );
  const lines = useMemo(() => tier1Lines(t1), [t1]);
  const empty = lines.length === 0;

  const [image, setImage] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (empty) {
      setImage(null);
      setUrl(null);
      return;
    }
    let alive = true;
    setError(null);
    (async () => {
      try {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const u = await buildTier1Url(t1, { origin, holder: DEMO_HOLDER });
        const png = await renderImage({ url: u, lines });
        if (!alive) return;
        setUrl(u);
        setImage(png);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, [t1, lines, empty, renderImage]);

  const idText = medicalIdText(t1);

  async function copyIdText() {
    try {
      await navigator.clipboard.writeText(idText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 클립보드 불가 — 텍스트는 아래 상자에서 직접 복사 */
    }
  }

  const check = "mt-0.5 h-5 w-5 flex-none accent-[var(--vital)]";
  const row = "flex min-h-[44px] items-start gap-3 rounded-2xl bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink)]";

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
          <h1 className="text-base font-extrabold tracking-tight text-[var(--ink)]">응급 잠금화면</h1>
        </header>

        <main className="flex-1 overflow-y-auto px-5 pb-12 pt-5">
          <p className="mb-4 rounded-2xl border-l-4 border-[var(--vital)] bg-[var(--surface)] px-4 py-3 text-xs leading-relaxed text-[var(--ink-2)]">
            <strong className="text-[var(--ink)]">의식이 없어 폰을 못 켜도</strong> 구급대원이 잠금화면의 QR을 아무
            카메라로 읽어 아래 정보를 봅니다. 이 배경을 쓰면 <strong className="text-[var(--ink)]">폰을 본 누구나
            읽을 수 있어요.</strong> 그래서 생명에 필요한 것만 넣고, 이름·주민등록번호는 들어가지 않아요.
          </p>

          <p className="mb-2 text-xs font-semibold text-[var(--ink-2)]">넣을 항목 고르기</p>
          <div className="flex flex-col gap-2">
            <label className={row}>
              <input type="checkbox" className={check} checked={useBlood} disabled={!available.blood} onChange={(e) => setUseBlood(e.target.checked)} />
              <span>
                혈액형 <strong>{available.blood ?? "정보 없음"}</strong>
              </span>
            </label>
            <label className={row}>
              <input type="checkbox" className={check} checked={useAllergy} disabled={available.allergens.length === 0} onChange={(e) => setUseAllergy(e.target.checked)} />
              <span>
                알레르기 <strong>{available.allergens.join(", ") || "정보 없음"}</strong>
              </span>
            </label>
            <label className={row}>
              <input type="checkbox" className={check} checked={useMeds} disabled={available.meds.length === 0} onChange={(e) => setUseMeds(e.target.checked)} />
              <span>
                복용약 <strong>{available.meds.join(", ") || "등록 없음"}</strong>
              </span>
            </label>
            <label className={row}>
              <input type="checkbox" className={check} checked={useContact} disabled={!available.contact} onChange={(e) => setUseContact(e.target.checked)} />
              <span>
                비상연락처{" "}
                <strong>
                  {available.contact
                    ? `${available.contact.label} ${formatPhone(available.contact.phone)}`
                    : "가족에 연락처가 있는 분이 없어요"}
                </strong>
              </span>
            </label>
          </div>

          {empty ? (
            <p className="mt-4 rounded-2xl bg-[var(--surface)] px-4 py-3 text-xs text-[var(--ink-2)]">
              적어도 한 항목을 골라 주세요.
            </p>
          ) : (
            <section className="mt-5">
              <p className="mb-2 text-xs font-semibold text-[var(--ink-2)]">미리보기</p>
              {error && (
                <p role="alert" className="mb-2 rounded-2xl border-l-4 border-[var(--vital)] bg-[var(--vital)]/8 px-4 py-3 text-xs text-[var(--vital-ink)]">
                  {error}
                </p>
              )}
              <div className="flex justify-center rounded-3xl bg-[var(--ink)] p-4">
                {image ? (
                  <img src={image} alt="응급 잠금화면 미리보기" className="w-40 rounded-2xl shadow-lg" />
                ) : (
                  <div className="h-[346px] w-40 animate-pulse rounded-2xl bg-white/10" />
                )}
              </div>
              {image && (
                <a
                  href={image}
                  download="응급-잠금화면.png"
                  className="mt-3 block w-full rounded-2xl bg-[var(--vital)] py-3.5 text-center text-base font-bold text-white active:brightness-95"
                >
                  이미지 저장
                </a>
              )}
              <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--ink-2)]">
                아이폰 Safari에서는 미리보기를 길게 눌러 "사진에 추가"로 저장해도 돼요.
              </p>
              {url && (
                <details className="mt-2 text-[10px] text-[var(--ink-2)]">
                  <summary className="cursor-pointer select-none font-semibold">QR에 담기는 주소(시연용)</summary>
                  <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-[var(--surface)] p-2 font-data">{url}</pre>
                </details>
              )}
            </section>
          )}

          <section className="mt-6 rounded-3xl bg-[var(--surface)] px-5 py-4 shadow-[0_1px_12px_rgba(11,59,60,0.07)]">
            <p className="text-sm font-bold text-[var(--ink)]">잠금화면으로 설정하는 법</p>
            <p className="mt-2 text-xs font-semibold text-[var(--ink-2)]">아이폰</p>
            <p className="text-xs leading-relaxed text-[var(--ink)]">설정 → 배경화면 → 새로운 배경화면 추가 → 사진 → 저장한 이미지 선택 → 잠금 화면으로 설정</p>
            <p className="mt-2 text-xs font-semibold text-[var(--ink-2)]">안드로이드</p>
            <p className="text-xs leading-relaxed text-[var(--ink)]">갤러리에서 이미지 열기 → ⋮ → 배경화면으로 설정 → 잠금화면</p>
            <p className="mt-2 text-[10px] leading-relaxed text-[var(--ink-2)]">
              정보가 바뀌면 여기서 다시 만들어 교체하세요. 예전 이미지의 QR은 그때 정보 그대로예요.
            </p>
          </section>

          <section className="mt-4 rounded-3xl bg-[var(--surface)] px-5 py-4 shadow-[0_1px_12px_rgba(11,59,60,0.07)]">
            <p className="text-sm font-bold text-[var(--ink)]">의료 ID에도 넣어 두기</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--ink-2)]">
              아이폰 건강 앱 → 의료 ID, 안드로이드 설정 → 안전 및 긴급 → 의료 정보의 "메모"에 붙여넣으면 우리 앱이 없어도
              남아요.
            </p>
            <label htmlFor="medical-id-text" className="sr-only">
              의료 ID 문구
            </label>
            <textarea
              id="medical-id-text"
              readOnly
              value={idText}
              rows={3}
              className="mt-2 w-full rounded-xl border border-[var(--mist)] bg-[var(--paper)] px-3 py-2 text-xs text-[var(--ink)]"
            />
            <button
              type="button"
              onClick={copyIdText}
              className="mt-2 w-full rounded-2xl border border-[var(--mist)] py-3 text-sm font-bold text-[var(--ink)] active:bg-[var(--paper)]"
            >
              {copied ? "복사됨" : "문구 복사"}
            </button>
          </section>

          <p className="mt-5 text-[10px] leading-relaxed text-[var(--ink-2)]">
            시연 — QR의 정보는 본인 키로 서명돼 변조를 막지만, 기관이 발급한 증명은 아니에요. 진료 이력 같은 2층
            정보는 응급 기관 확인이나 가족 승인이 있어야 열리도록 설계돼 있고(서버 필요), 아직 만들지 않았어요.
          </p>
        </main>
      </div>
    </div>
  );
}
