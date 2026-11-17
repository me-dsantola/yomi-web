import { catalog } from "./cosmetic-catalog";
import { radiusAtAngle, toPoints, type Silhouette } from "./bot/shape";
export const CATEGORIES = ["aura", "scarf", "hat", "floating"] as const;
export type Category = (typeof CATEGORIES)[number];
export type Equipment = Record<Category, string>;
export const EMPTY_EQUIPMENT: Equipment = {
  aura: "",
  scarf: "",
  hat: "",
  floating: "",
};
export const ITEMS = catalog.items;
export const EVENTS = catalog.events;
export const ITEM_BY_ID = new Map(ITEMS.map((item) => [item.id, item]));
export function eventAvailable(event: string, now = new Date()): boolean {
  if (event === "always") return true;
  const definition = EVENTS.find((e) => e.id === event);
  if (!definition) return false;
  if (!Number.isFinite(now.getTime())) return false;
  const local = new Date(now.getTime() + catalog.utcOffsetMinutes * 60000);
  const day = (local.getUTCMonth() + 1) * 100 + local.getUTCDate();
  return definition.start < definition.end
    ? day >= definition.start && day < definition.end
    : day >= definition.start || day < definition.end;
}
/** Override affects presentation only; Firestore validates every real claim independently. */
export function activeSeason(now = new Date(), override?: string | null) {
  if (override !== undefined)
    return EVENTS.find((e) => e.id === override) ?? null;
  return (
    [...EVENTS]
      .filter((e) => eventAvailable(e.id, now))
      .sort((a, b) => b.priority - a.priority)[0] ?? null
  );
}
export function sanitizeEquipment(
  value: unknown,
  owned: ReadonlySet<string>,
): Equipment {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return Object.fromEntries(
    CATEGORIES.map((category) => {
      const id = source[category];
      return [
        category,
        typeof id === "string" &&
        owned.has(id) &&
        ITEM_BY_ID.get(id)?.category === category
          ? id
          : "",
      ];
    }),
  ) as Equipment;
}
export function equipItem(
  current: Equipment,
  id: string,
  owned: ReadonlySet<string>,
): Equipment {
  const item = ITEM_BY_ID.get(id);
  if (!item || !owned.has(id))
    throw Error("Este item ainda não foi resgatado.");
  return { ...current, [item.category]: id };
}
/** Anchors are measured on the same profile, rotation and breathing as the painted body. */
export function attachmentAnchors(sil: Silhouette) {
  const point = (angle: number) => {
    const r = radiusAtAngle(sil.radii, angle),
      x = r * Math.cos(angle),
      y = r * Math.sin(angle),
      c = Math.cos(sil.rot),
      s = Math.sin(sil.rot);
    return {
      x: (sil.cx + (x * c - y * s) * sil.sx) * 100,
      y: (sil.cy + (x * s + y * c) * sil.sy) * 100,
    };
  };
  const top = point(-Math.PI / 2),
    left = point((Math.PI * 5) / 6),
    right = point(Math.PI / 6);
  const points = toPoints(sil, 100);
  return {
    top,
    neck: {
      x: (left.x + right.x) / 2,
      y: (left.y + right.y) / 2,
      width: Math.hypot(right.x - left.x, right.y - left.y),
      angle: (Math.atan2(right.y - left.y, right.x - left.x) * 180) / Math.PI,
    },
    rotation: (sil.rot * 180) / Math.PI,
    center: { x: sil.cx * 100, y: sil.cy * 100 },
    radius: Math.max(
      ...points.map((p) => Math.hypot(p.x - sil.cx * 100, p.y - sil.cy * 100)),
    ),
  };
}
