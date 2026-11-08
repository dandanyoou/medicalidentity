import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * 배포 직후 흰 화면 방지.
 *
 * 새 서비스워커가 옛 캐시를 지운 뒤, 열려 있던 탭에서 아직 안 연 화면(지연 로드)을
 * 누르면 옛 해시의 JS 파일을 못 받아 "Failed to fetch dynamically imported module"로
 * 렌더가 죽는다. 그 경우 한 번만 자동 새로고침해 새 버전을 받는다. 방금 새로고침했는데
 * 또 실패하면 무한 새로고침 대신 안내 화면을 보여준다.
 */
export const RELOAD_GUARD_KEY = "medid.chunkReloadAt";
const GUARD_WINDOW_MS = 30_000;

const CHUNK_ERROR =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .* failed/i;

export function isChunkLoadError(error: unknown): boolean {
  return error instanceof Error && CHUNK_ERROR.test(error.message);
}

function reloadedRecently(): boolean {
  try {
    const at = Number(sessionStorage.getItem(RELOAD_GUARD_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < GUARD_WINDOW_MS;
  } catch {
    return false;
  }
}

function markReload(): void {
  try {
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    /* no-op */
  }
}

interface Props {
  children: ReactNode;
  /** 테스트 주입용 — 기본은 window.location.reload. */
  onReload?: () => void;
}

interface State {
  error: Error | null;
  reloading: boolean;
}

export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { error: null, reloading: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    if (isChunkLoadError(error) && !reloadedRecently()) {
      markReload();
      this.setState({ reloading: true });
      this.reload();
    }
  }

  private reload = () => {
    (this.props.onReload ?? (() => window.location.reload()))();
  };

  private manualReload = () => {
    try {
      sessionStorage.removeItem(RELOAD_GUARD_KEY);
    } catch {
      /* no-op */
    }
    this.reload();
  };

  render() {
    const { error, reloading } = this.state;
    if (!error) return this.props.children;
    if (reloading) return null;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--paper)] px-6 text-center">
        <p className="text-base font-extrabold text-[var(--ink)]">화면을 불러오지 못했어요</p>
        <p className="text-sm leading-relaxed text-[var(--ink-2)]">
          앱이 새 버전으로 바뀌었거나 연결이 불안정해요. 다시 불러오면 대부분 해결돼요.
        </p>
        <button
          type="button"
          onClick={this.manualReload}
          className="mt-2 rounded-2xl bg-[var(--ink)] px-6 py-3 text-sm font-bold text-white active:brightness-110"
        >
          다시 불러오기
        </button>
      </div>
    );
  }
}
