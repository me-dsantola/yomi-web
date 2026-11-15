import { describe, expect, it } from 'vitest';
import {
  calculateScrollActivePage,
  clampReaderPageIndex,
  resolvePagedSwipeAction,
  resolvePagedTapAction,
  shouldShowMobileBottomNav,
} from '../lib/mobile/readerTouchAndNav';

describe('resolvePagedTapAction', () => {
  const rectLeft = 20;
  const rectWidth = 400; // left < 140, center 140..300, right > 300

  it('navigates prev/next according to LTR zones and toggles HUD in center', () => {
    expect(resolvePagedTapAction(80, rectLeft, rectWidth, 'paged-ltr')).toBe(
      'prev'
    );
    expect(resolvePagedTapAction(220, rectLeft, rectWidth, 'paged-ltr')).toBe(
      'toggle-hud'
    );
    expect(resolvePagedTapAction(360, rectLeft, rectWidth, 'paged-ltr')).toBe(
      'next'
    );
  });

  it('inverts left/right tap zones for RTL reading mode', () => {
    expect(resolvePagedTapAction(80, rectLeft, rectWidth, 'paged-rtl')).toBe(
      'next'
    );
    expect(resolvePagedTapAction(220, rectLeft, rectWidth, 'paged-rtl')).toBe(
      'toggle-hud'
    );
    expect(resolvePagedTapAction(360, rectLeft, rectWidth, 'paged-rtl')).toBe(
      'prev'
    );
  });

  it('handles exact zone boundaries cleanly', () => {
    // 0.30 * 400 = 120 -> 20 + 120 = 140 (center starts inclusive)
    expect(resolvePagedTapAction(140, rectLeft, rectWidth, 'paged-ltr')).toBe(
      'toggle-hud'
    );
    // 0.70 * 400 = 280 -> 20 + 280 = 300 (center ends inclusive)
    expect(resolvePagedTapAction(300, rectLeft, rectWidth, 'paged-ltr')).toBe(
      'toggle-hud'
    );
    expect(resolvePagedTapAction(301, rectLeft, rectWidth, 'paged-ltr')).toBe(
      'next'
    );
  });

  it('falls back safely to toggle-hud on invalid geometry', () => {
    expect(resolvePagedTapAction(100, 0, 0, 'paged-ltr')).toBe('toggle-hud');
    expect(resolvePagedTapAction(Number.NaN, 0, 320, 'paged-rtl')).toBe(
      'toggle-hud'
    );
  });
});

describe('resolvePagedSwipeAction', () => {
  it('detects LTR horizontal swipes cleanly', () => {
    expect(resolvePagedSwipeAction(-80, 12, 'paged-ltr')).toBe('next');
    expect(resolvePagedSwipeAction(80, -10, 'paged-ltr')).toBe('prev');
  });

  it('detects RTL horizontal swipes cleanly', () => {
    expect(resolvePagedSwipeAction(-80, 10, 'paged-rtl')).toBe('prev');
    expect(resolvePagedSwipeAction(80, 10, 'paged-rtl')).toBe('next');
  });

  it('ignores swipes in webtoon continuous mode', () => {
    expect(resolvePagedSwipeAction(-120, 0, 'webtoon')).toBeNull();
    expect(resolvePagedSwipeAction(120, 0, 'webtoon')).toBeNull();
  });

  it('ignores short taps and predominantly vertical scroll gestures', () => {
    expect(resolvePagedSwipeAction(32, 0, 'paged-ltr')).toBeNull();
    expect(resolvePagedSwipeAction(-40, 0, 'paged-rtl')).toBeNull();
    expect(resolvePagedSwipeAction(60, 50, 'paged-ltr')).toBeNull();
    expect(resolvePagedSwipeAction(-70, -60, 'paged-rtl')).toBeNull();
  });
});

describe('clampReaderPageIndex', () => {
  it('clamps indices safely within chapter bounds', () => {
    expect(clampReaderPageIndex(0, 18)).toBe(0);
    expect(clampReaderPageIndex(5, 18)).toBe(5);
    expect(clampReaderPageIndex(25, 18)).toBe(17);
    expect(clampReaderPageIndex(-3, 18)).toBe(0);
    expect(clampReaderPageIndex(Number.NaN, 18)).toBe(0);
    expect(clampReaderPageIndex(4.8, 18)).toBe(4);
    expect(clampReaderPageIndex(3, 0)).toBe(0);
  });
});

describe('calculateScrollActivePage', () => {
  it('picks the page whose bounds contain viewportCenterY', () => {
    const rects = [
      { index: 0, top: -900, bottom: -120 },
      { index: 1, top: -120, bottom: 680 },
      { index: 2, top: 680, bottom: 1480 },
    ];
    expect(calculateScrollActivePage(380, rects)).toBe(1);
    expect(calculateScrollActivePage(720, rects)).toBe(2);
  });

  it('picks the nearest page when viewport center falls between gaps', () => {
    const rects = [
      { index: 0, top: -200, bottom: 100 },
      { index: 1, top: 240, bottom: 900 },
    ];
    expect(calculateScrollActivePage(210, rects)).toBe(1);
    expect(calculateScrollActivePage(130, rects)).toBe(0);
  });

  it('returns 0 when rects list is empty', () => {
    expect(calculateScrollActivePage(400, [])).toBe(0);
  });
});

describe('shouldShowMobileBottomNav', () => {
  it('stays visible on main app routes at top or while scrolling up', () => {
    expect(
      shouldShowMobileBottomNav({
        pathname: '/',
        isKeyboardOpen: false,
        scrollDirection: 'idle',
        scrollY: 0,
      })
    ).toBe(true);

    expect(
      shouldShowMobileBottomNav({
        pathname: '/explorar',
        isKeyboardOpen: false,
        scrollDirection: 'up',
        scrollY: 420,
      })
    ).toBe(true);

    expect(
      shouldShowMobileBottomNav({
        pathname: '/biblioteca',
        isKeyboardOpen: false,
        scrollDirection: 'down',
        scrollY: 40,
      })
    ).toBe(true);
  });

  it('hides on reader routes, during active scroll-down past threshold, or when keyboard is open', () => {
    expect(
      shouldShowMobileBottomNav({
        pathname: '/ler/abc-123',
        isKeyboardOpen: false,
        scrollDirection: 'up',
        scrollY: 0,
      })
    ).toBe(false);

    expect(
      shouldShowMobileBottomNav({
        pathname: '/conta',
        isKeyboardOpen: true,
        scrollDirection: 'idle',
        scrollY: 0,
      })
    ).toBe(false);

    expect(
      shouldShowMobileBottomNav({
        pathname: '/explorar',
        isKeyboardOpen: false,
        scrollDirection: 'down',
        scrollY: 220,
      })
    ).toBe(false);
  });
});
