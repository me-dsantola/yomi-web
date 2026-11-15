export type ReaderMode = 'webtoon' | 'paged-rtl' | 'paged-ltr';

export type ReaderTapAction = 'prev' | 'next' | 'toggle-hud';
export type ReaderSwipeAction = 'prev' | 'next' | null;
export type MobileScrollDirection = 'up' | 'down' | 'idle';

export interface ScrollPageRect {
  index: number;
  top: number;
  bottom: number;
}

export interface MobileBottomNavVisibilityParams {
  pathname: string | null;
  isKeyboardOpen: boolean;
  scrollDirection: MobileScrollDirection;
  scrollY: number;
}

/**
 * Resolves the tap zone action inside the paged reader canvas:
 * - Left 30%: previous page in LTR, next page in RTL
 * - Right 30%: next page in LTR, previous page in RTL
 * - Center 40%: toggle reader HUD
 */
export function resolvePagedTapAction(
  clientX: number,
  rectLeft: number,
  rectWidth: number,
  mode: ReaderMode,
): ReaderTapAction {
  if (
    !Number.isFinite(clientX) ||
    !Number.isFinite(rectLeft) ||
    !Number.isFinite(rectWidth) ||
    rectWidth <= 0
  ) {
    return 'toggle-hud';
  }

  const ratio = (clientX - rectLeft) / Math.max(1, rectWidth);
  const isRtl = mode === 'paged-rtl';

  if (ratio < 0.3) {
    return isRtl ? 'next' : 'prev';
  }

  if (ratio > 0.7) {
    return isRtl ? 'prev' : 'next';
  }

  return 'toggle-hud';
}

/**
 * Resolves horizontal swipe gestures for paged reading modes without
 * interfering with vertical scrolling.
 */
export function resolvePagedSwipeAction(
  dx: number,
  dy: number,
  mode: ReaderMode,
  minDistance = 48,
): ReaderSwipeAction {
  if (mode === 'webtoon') {
    return null;
  }

  if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
    return null;
  }

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx < minDistance || absDx <= absDy * 1.35) {
    return null;
  }

  const isRtl = mode === 'paged-rtl';
  if (dx < 0) {
    return isRtl ? 'prev' : 'next';
  }

  return isRtl ? 'next' : 'prev';
}

/**
 * Clamps a reader page index to a valid integer in [0, totalPages - 1].
 */
export function clampReaderPageIndex(page: number, totalPages: number): number {
  if (!Number.isFinite(totalPages) || totalPages <= 0) {
    return 0;
  }

  if (!Number.isFinite(page) || page <= 0) {
    return 0;
  }

  const maxIndex = Math.max(0, Math.floor(totalPages) - 1);
  return Math.min(Math.floor(page), maxIndex);
}

/**
 * Picks the active webtoon page matching the viewport center line.
 */
export function calculateScrollActivePage(
  viewportCenterY: number,
  pageRects: readonly ScrollPageRect[],
): number {
  if (!pageRects || pageRects.length === 0 || !Number.isFinite(viewportCenterY)) {
    return 0;
  }

  let bestIndex = pageRects[0].index;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const rect of pageRects) {
    if (!Number.isFinite(rect.top) || !Number.isFinite(rect.bottom)) {
      continue;
    }

    if (rect.top <= viewportCenterY && rect.bottom >= viewportCenterY) {
      return Math.max(0, rect.index);
    }

    const distance =
      viewportCenterY < rect.top
        ? rect.top - viewportCenterY
        : viewportCenterY - rect.bottom;

    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = rect.index;
    }
  }

  return Math.max(0, bestIndex);
}

/**
 * Controls visibility of the persistent mobile bottom navigation bar.
 */
export function shouldShowMobileBottomNav({
  pathname,
  isKeyboardOpen,
  scrollDirection,
  scrollY,
}: MobileBottomNavVisibilityParams): boolean {
  if (pathname?.startsWith('/ler/') || pathname === '/ler') {
    return false;
  }

  if (isKeyboardOpen) {
    return false;
  }

  if (scrollDirection === 'down' && Number.isFinite(scrollY) && scrollY > 96) {
    return false;
  }

  return true;
}
