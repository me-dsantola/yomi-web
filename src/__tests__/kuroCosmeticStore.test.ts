import { beforeEach, describe, expect, it, vi } from "vitest";
const spies = vi.hoisted(() => ({
  listeners: [] as {
    ref: string;
    options: unknown;
    next: (snap: any) => void;
  }[],
  write: vi.fn(),
}));
vi.mock("@/lib/firebase/client", () => ({
  getFirebaseClient: () => ({ db: {} }),
}));
vi.mock("firebase/firestore", () => ({
  collection: (_: unknown, ...path: string[]) => path.join("/"),
  doc: (_: unknown, ...path: string[]) => path.join("/"),
  serverTimestamp: () => "server-time",
  setDoc: (...args: unknown[]) => {
    spies.write(...args);
    return Promise.resolve();
  },
  getDocs: vi.fn(),
  runTransaction: vi.fn(),
  onSnapshot: (ref: string, options: unknown, next: (snap: any) => void) => {
    spies.listeners.push({ ref, options, next });
    return () => {};
  },
}));
import {
  bindCosmeticAccount,
  getCosmetics,
  saveEquipment,
} from "@/lib/kuro/store";
import { EMPTY_EQUIPMENT } from "@/lib/kuro/cosmetics";
describe("account wardrobe confirmation", () => {
  beforeEach(() => {
    bindCosmeticAccount(null);
    spies.listeners = [];
    spies.write.mockClear();
  });
  it("waits for server confirmation and receives metadata-only acknowledgements", () => {
    bindCosmeticAccount("alice");
    const [inventory, equipment] = spies.listeners;
    expect(inventory.options).toEqual({ includeMetadataChanges: true });
    expect(equipment.options).toEqual({ includeMetadataChanges: true });
    inventory.next({
      docs: [{ id: "aurora" }],
      metadata: { hasPendingWrites: true },
    });
    expect(getCosmetics().owned.has("aurora")).toBe(false);
    inventory.next({
      docs: [{ id: "aurora" }],
      metadata: { hasPendingWrites: false },
    });
    equipment.next({
      data: () => ({ ...EMPTY_EQUIPMENT, aura: "aurora" }),
      metadata: { hasPendingWrites: false },
    });
    expect(getCosmetics().ready).toBe(true);
    expect(getCosmetics().equipment.aura).toBe("aurora");
  });
  it("clears gear on account switch and ignores stale snapshots, including same-UID reconnects", () => {
    bindCosmeticAccount("alice");
    const old = spies.listeners[0];
    old.next({
      docs: [{ id: "aurora" }],
      metadata: { hasPendingWrites: false },
    });
    bindCosmeticAccount("bob");
    expect(getCosmetics().owned.size).toBe(0);
    expect(getCosmetics().equipment).toEqual(EMPTY_EQUIPMENT);
    old.next({
      docs: [{ id: "santa_hat" }],
      metadata: { hasPendingWrites: false },
    });
    expect(getCosmetics().owned.size).toBe(0);
    bindCosmeticAccount("alice");
    old.next({
      docs: [{ id: "santa_hat" }],
      metadata: { hasPendingWrites: false },
    });
    expect(getCosmetics().owned.size).toBe(0);
  });
  it("saves only owned slot items and supports desequipping without deleting grants", async () => {
    bindCosmeticAccount("alice");
    spies.listeners[0].next({
      docs: [{ id: "aurora" }],
      metadata: { hasPendingWrites: false },
    });
    await expect(
      saveEquipment({ ...EMPTY_EQUIPMENT, hat: "santa_hat" }),
    ).rejects.toThrow();
    expect(spies.write).not.toHaveBeenCalled();
    await saveEquipment({ ...EMPTY_EQUIPMENT, aura: "aurora" });
    await saveEquipment(EMPTY_EQUIPMENT);
    expect(spies.write).toHaveBeenCalledTimes(2);
    expect(getCosmetics().owned.has("aurora")).toBe(true);
  });
});
