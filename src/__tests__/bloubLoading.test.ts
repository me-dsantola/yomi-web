import { describe, expect, it } from 'vitest';
import { BotEngine } from '@/components/brand/bloub/bot/engine';
import { SHAPES } from '@/components/brand/bloub/bot/skins';
import { DOT_R, DOT_PEAK } from '@/components/brand/bloub/bot/decor';

describe('three-dot loading morph', () => {
  it('shrinks into the central dot, keeps two side dots and restores every selected shape', () => {
    for (const shape of SHAPES) {
      const engine = new BotEngine(100, 'idle', shape.radii);
      engine.setState('thinking', 1);
      for (const time of [1.5, 2, 3]) {
        const frame = engine.sample(time);
        expect(Math.max(...frame.silhouette.radii)).toBeLessThanOrEqual(DOT_R * DOT_PEAK);
        expect(new Set(frame.silhouette.radii).size).toBe(1);
        expect(frame.dots).toHaveLength(2);
        expect(frame.eyes.every(eye => eye.alpha === 0)).toBe(true);
      }
      engine.setState('idle', 4);
      expect(engine.sample(4.6).silhouette.radii).toEqual(shape.radii);
      expect(engine.sample(4.6).dots).toHaveLength(0);
      expect(engine.sample(4.6).eyes.some(eye => eye.alpha > 0)).toBe(true);
    }
  });

  it('retains a new shape selected while loading', () => {
    const engine = new BotEngine(100, 'thinking', SHAPES[0].radii);
    engine.setShape(SHAPES[7].radii, 1);
    expect(Math.max(...engine.sample(2).silhouette.radii)).toBeLessThan(.21);
    engine.setState('idle', 3);
    expect(engine.sample(3.6).silhouette.radii).toEqual(SHAPES[7].radii);
  });
});
