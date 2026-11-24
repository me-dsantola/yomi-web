import { describe, it, expect } from "vitest";
import data from "@/lib/kuro/catalog.json";
import {
  ITEMS,
  EVENTS,
  activeSeason,
  eventAvailable,
  sanitizeEquipment,
  equipItem,
  EMPTY_EQUIPMENT,
  attachmentAnchors,
} from "@/lib/kuro/cosmetics";
import { BotEngine } from "@/components/brand/bloub/bot/engine";
import { SHAPES } from "@/components/brand/bloub/bot/skins";
describe("Kuro seasons and wardrobe", () => {
  it("keeps generated catalog and JSON synchronized", () => {
    expect(ITEMS).toEqual(data.items);
    expect(EVENTS).toEqual(data.events);
  });
  it("uses inclusive start and exclusive end in UTC-03 across years", () => {
    expect(eventAvailable("christmas", new Date("2026-12-01T02:59:59Z"))).toBe(
      false,
    );
    expect(eventAvailable("christmas", new Date("2026-12-01T03:00:00Z"))).toBe(
      true,
    );
    expect(eventAvailable("christmas", new Date("2027-01-01T02:59:59Z"))).toBe(
      true,
    );
    expect(eventAvailable("christmas", new Date("2027-01-01T03:00:00Z"))).toBe(
      false,
    );
    expect(activeSeason(new Date("2026-12-30T12:00:00Z"))?.id).toBe("newyear");
    expect(activeSeason(new Date("2027-01-08T03:00:00Z"))).toBeNull();
  });
  it("preview override never changes actual claim availability", () => {
    const now = new Date("2026-11-17T12:00:00Z");
    expect(activeSeason(now, "christmas")?.id).toBe("christmas");
    expect(eventAvailable("christmas", now)).toBe(false);
    expect(activeSeason(now, "none")).toBeNull();
  });
  it("keeps owned outfits usable outside their seasonal window", () => {
    const owned = new Set([
      "santa_hat",
      "winter_scarf",
      "aurora",
      "little_star",
    ]);
    let e = equipItem(EMPTY_EQUIPMENT, "santa_hat", owned);
    e = equipItem(e, "winter_scarf", owned);
    e = equipItem(e, "aurora", owned);
    e = equipItem(e, "little_star", owned);
    expect(sanitizeEquipment(e, owned)).toEqual(e);
    expect(eventAvailable("christmas", new Date("2027-07-01"))).toBe(false);
    expect(sanitizeEquipment({ ...e, hat: "" }, owned).scarf).toBe(
      "winter_scarf",
    );
  });
  it("rejects unowned and wrong-category items", () => {
    expect(() => equipItem(EMPTY_EQUIPMENT, "santa_hat", new Set())).toThrow();
    expect(
      sanitizeEquipment(
        { hat: "aurora", scarf: "santa_hat", floating: "unknown" },
        new Set(["aurora", "santa_hat"]),
      ),
    ).toEqual(EMPTY_EQUIPMENT);
  });
  it("anchors track real width, tilt and breathing instead of a fixed circle", () => {
    for (const shape of SHAPES) {
      const e = new BotEngine(100, "idle", shape.radii);
      const f = e.sample(0.8),
        a = attachmentAnchors(f.silhouette);
      expect(a.neck.width).toBeGreaterThan(30);
      expect(a.top.y).toBeLessThan(a.center.y);
      expect(Object.values(a.neck).every(Number.isFinite)).toBe(true);
    }
  });
  it("fades gear out and back without a discontinuity at transitions", () => {
    const e = new BotEngine(100, "idle", SHAPES[0].radii);
    e.setState("orbit", 1);
    expect(e.sample(1).accessoryAlpha).toBe(1);
    expect(e.sample(1.3).accessoryAlpha).toBeGreaterThan(0);
    expect(e.sample(1.3).accessoryAlpha).toBeLessThan(1);
    expect(e.sample(1.8).accessoryAlpha).toBe(0);
    e.setState("idle", 2);
    expect(e.sample(2).accessoryAlpha).toBe(0);
    expect(e.sample(2.6).accessoryAlpha).toBe(1);
    e.setState("orbit", 3);
    const visible = e.sample(3.2).accessoryAlpha;
    e.setState("idle", 3.2);
    expect(e.sample(3.2).accessoryAlpha).toBeCloseTo(visible, 8);
  });
});
