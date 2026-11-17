import { attachmentAnchors, ITEM_BY_ID, type Equipment } from "./cosmetics";
import type { BotFrame } from "./bot/engine";
const NS = "http://www.w3.org/2000/svg";
export class CosmeticRenderer {
  readonly behind = document.createElementNS(NS, "g");
  readonly front = document.createElementNS(NS, "g");
  private aura = document.createElementNS(NS, "g");
  private scarf = document.createElementNS(NS, "g");
  private hat = document.createElementNS(NS, "g");
  private floating = document.createElementNS(NS, "g");
  private selection = "";
  constructor() {
    for (const [group, slot] of [
      [this.aura, "aura"],
      [this.scarf, "scarf"],
      [this.hat, "hat"],
      [this.floating, "floating"],
    ] as const)
      group.setAttribute("data-kuro-slot", slot);
    this.behind.append(this.aura);
    this.front.append(this.scarf, this.hat, this.floating);
    this.behind.setAttribute("aria-hidden", "true");
    this.front.setAttribute("aria-hidden", "true");
  }
  draw(frame: BotFrame, equipment: Equipment, time: number) {
    const signature = JSON.stringify(equipment);
    if (this.selection !== signature) {
      this.selection = signature;
      this.aura.innerHTML = equipment.aura
        ? '<path fill="none" stroke-width="18" opacity=".08"/><path fill="none" stroke-width="9" opacity=".16"/><path fill="none" stroke-width="2" opacity=".7"/>'
        : "";
      this.scarf.innerHTML = equipment.scarf
        ? '<path d="M-86 -9 Q0 13 86 -9 L84 8 Q0 29-84 8Z" stroke="#ffc4d8" stroke-width="1.2"/><path d="M44 13 l20-3 8 49-22 5Z" stroke="#ffc4d8" stroke-width="1.2"/><path d="M49 53 l21-5" fill="none" stroke="#ffe0d9" stroke-width="3"/>'
        : "";
      const hat = ITEM_BY_ID.get(equipment.hat);
      this.hat.innerHTML =
        hat?.design === "santa"
          ? '<path d="M-60 2 Q-45-64 8-67 Q51-71 63-19 L45-15 Q31-40 15-35 Q-8-30-25 7Z" stroke="#ffaec9" stroke-width="1.5"/><path d="M-63 1 Q0-17 55 2 L56 19 Q0 4-62 18Z" fill="#fff2fd" stroke="#d4bde4" stroke-width="1.5"/><circle cx="59" cy="-13" r="12" fill="#fff2fd"/>'
          : hat?.design === "witch"
            ? '<path d="M-48 4 L-11-78 Q4-96 30-67 L13-55 43 3Z" stroke="#d1adff" stroke-width="1.4"/><path d="M-67 4 Q0-13 62 5 Q74 17 3 23 Q-77 22-67 4Z" stroke="#d1adff" stroke-width="1.4"/><path d="M-34-10 Q0-22 31-10 L36 0 Q0-11-39 0Z" fill="#e3b366"/>'
            : "";
      const object = ITEM_BY_ID.get(equipment.floating);
      this.floating.innerHTML =
        object?.design === "star"
          ? '<path d="M0-16 5-5 17-4 8 4 10 16 0 10-10 16-8 4-17-4-5-5Z" stroke="#fff1ff" stroke-width="1"/>'
          : object?.design === "book"
            ? '<path d="M-22-16 Q-8-19 0-11 Q8-19 22-16 V17 Q9 14 0 22 Q-9 14-22 17Z" stroke="#e0d4ff" stroke-width="1.5"/><path d="M0-11 V22" stroke="#e0d4ff" stroke-width="1.5"/>'
            : object?.design === "pumpkin"
              ? '<ellipse rx="20" ry="16"/><path d="M-3-15 l4-10 5 2-3 10Z" fill="#73c9a1"/><path d="M-12-3 l7-5 2 7 M4-1 l2-7 7 5 M-9 6 Q0 15 9 6" fill="#322043"/>'
              : "";
      for (const [group, id] of [
        [this.aura, equipment.aura],
        [this.scarf, equipment.scarf],
        [this.hat, equipment.hat],
        [this.floating, equipment.floating],
      ] as const) {
        const item = ITEM_BY_ID.get(id);
        group.setAttribute(
          group === this.aura ? "stroke" : "fill",
          item?.color ?? "none",
        );
      }
    }
    const a = attachmentAnchors(frame.silhouette),
      opacity = String(frame.accessoryAlpha * frame.bodyAlpha);
    this.behind.setAttribute("opacity", opacity);
    this.front.setAttribute("opacity", opacity);
    for (const path of this.aura.children)
      path.setAttribute("d", frame.bodyPath);
    this.scarf.setAttribute(
      "transform",
      `translate(${a.neck.x} ${a.neck.y}) rotate(${a.neck.angle}) scale(${a.neck.width / 172})`,
    );
    this.hat.setAttribute(
      "transform",
      `translate(${a.top.x} ${a.top.y + 3}) rotate(${a.rotation}) scale(${Math.max(0.5, Math.min(1.1, a.neck.width / 172)) * (ITEM_BY_ID.get(equipment.hat)?.design === "santa" ? 0.85 : 0.6)})`,
    );
    this.floating.setAttribute(
      "transform",
      `translate(${a.center.x + Math.cos(time * 0.7) * (a.radius + 24)} ${a.center.y + Math.sin(time * 0.7) * (a.radius + 18)}) rotate(${Math.sin(time) * 8})`,
    );
  }
}
