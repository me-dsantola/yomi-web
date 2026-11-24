import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPagePointer, pagePointerLook, trackPagePointer } from '@/components/brand/bloub/page-pointer';

describe('page-wide companion gaze', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shares page tracking until the last companion releases it', () => {
    const page = new EventTarget();
    const document = new EventTarget();
    vi.stubGlobal('window', page);
    vi.stubGlobal('document', document);
    const listen = vi.spyOn(page, 'addEventListener');
    const remove = vi.spyOn(page, 'removeEventListener');
    const first = trackPagePointer(), second = trackPagePointer();
    const send = (type: string, values: object = {}) => page.dispatchEvent(Object.assign(new Event(type), values));
    try {
      expect(listen.mock.calls.filter(([name]) => name === 'pointermove')).toHaveLength(1);
      send('pointermove', { pointerType: 'mouse', clientX: 1100, clientY: 500 });
      expect(getPagePointer()).toEqual({ x: 1100, y: 500 });
      first(); first();
      expect(remove).not.toHaveBeenCalled();
      // Moving between page elements is not leaving the window.
      send('pointerout', { relatedTarget: {} });
      expect(getPagePointer()).not.toBeNull();
      send('pointerout', { relatedTarget: null });
      expect(getPagePointer()).toBeNull();
      send('pointermove', { pointerType: 'mouse', clientX: 100, clientY: 200 });
      send('pointermove', { pointerType: 'touch', clientX: 300, clientY: 400 });
      expect(getPagePointer()).toBeNull();
      send('pointermove', { pointerType: 'mouse', clientX: 100, clientY: 200 });
      send('blur');
      expect(getPagePointer()).toBeNull();
    } finally { first(); second(); }
    expect(remove.mock.calls.filter(([name]) => name === 'pointermove')).toHaveLength(1);
    expect(getPagePointer()).toBeNull();
  });

  it('uses the current on-screen bounds after scroll and limits angles', () => {
    const bounds = { left: 300, top: 300, width: 100, height: 100 };
    const viewport = { width: 1400, height: 1000 };
    expect(pagePointerLook({ x: 350, y: 350 }, bounds, viewport)).toEqual({ yaw: 0, pitch: -0 });
    const near = pagePointerLook({ x: 600, y: 100 }, bounds, viewport);
    const far = pagePointerLook({ x: 900, y: 50 }, bounds, viewport);
    expect(near.yaw).toBeGreaterThan(0);
    expect(near.pitch).toBeGreaterThan(0);
    expect(far.yaw).toBeGreaterThan(near.yaw);
    expect(far.pitch).toBeGreaterThan(near.pitch);
    expect(pagePointerLook({ x: -9000, y: 9000 }, bounds, viewport)).toEqual({ yaw: -45, pitch: -30 });
    expect(pagePointerLook({ x: 350, y: 350 }, { ...bounds, top: 100 }, viewport).pitch).toBeLessThan(0);
  });
});
