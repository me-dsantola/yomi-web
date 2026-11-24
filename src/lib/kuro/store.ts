import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import {
  CATEGORIES,
  EMPTY_EQUIPMENT,
  ITEM_BY_ID,
  sanitizeEquipment,
  type Equipment,
} from "./cosmetics";
type Snapshot = {
  uid: string | null;
  owned: ReadonlySet<string>;
  equipment: Equipment;
  ready: boolean;
  error: string | null;
};
const EMPTY: Snapshot = {
  uid: null,
  owned: new Set(),
  equipment: EMPTY_EQUIPMENT,
  ready: true,
  error: null,
};
let state: Snapshot = EMPTY,
  stops: Unsubscribe[] = [],
  listeners = new Set<() => void>(),
  generation = 0;
function publish(next: Snapshot) {
  state = next;
  listeners.forEach((fn) => fn());
}
export const subscribeCosmetics = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
export const getCosmetics = () => state;
export const getServerCosmetics = () => EMPTY;
/** One account-scoped live subscription, shared by all rendered mascots. */
export function bindCosmeticAccount(uid: string | null) {
  const version = ++generation;
  stops.forEach((stop) => stop());
  stops = [];
  publish({ ...EMPTY, uid, ready: !uid });
  if (!uid) return;
  const { db } = getFirebaseClient();
  let owned = new Set<string>(),
    equipment: unknown = {},
    gotItems = false,
    gotEquipment = false;
  const update = () => {
    if (generation === version && state.uid === uid)
      publish({
        uid,
        owned,
        equipment: sanitizeEquipment(equipment, owned),
        ready: gotItems && gotEquipment,
        error: null,
      });
  };
  const fail = (e: Error) => {
    if (generation === version && state.uid === uid)
      publish({
        ...state,
        ready: true,
        error: "Não foi possível sincronizar o guarda-roupa. Tente novamente.",
      });
  };
  stops.push(
    onSnapshot(
      collection(db, "kuroUsers", uid, "items"),
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.metadata.hasPendingWrites) return;
        owned = new Set(
          snap.docs.map((d) => d.id).filter((id) => ITEM_BY_ID.has(id)),
        );
        gotItems = true;
        update();
      },
      fail,
    ),
  );
  stops.push(
    onSnapshot(
      doc(db, "kuroUsers", uid, "state", "equipment"),
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.metadata.hasPendingWrites) return;
        equipment = snap.data() ?? {};
        gotEquipment = true;
        update();
      },
      fail,
    ),
  );
}
export async function claimCosmetic(id: string) {
  const uid = state.uid;
  if (!uid) throw Error("Entre na sua conta para resgatar.");
  if (!ITEM_BY_ID.has(id)) throw Error("Item desconhecido.");
  const { db } = getFirebaseClient();
  await confirmed(
    runTransaction(db, async (tx) => {
      const ref = doc(db, "kuroUsers", uid, "items", id);
      const snap = await tx.get(ref);
      if (!snap.exists())
        tx.set(ref, { itemId: id, claimedAt: serverTimestamp() });
    }),
  );
}
export async function saveEquipment(value: Equipment) {
  const uid = state.uid;
  if (!uid) throw Error("Entre na sua conta para salvar.");
  const safe = sanitizeEquipment(value, state.owned);
  if (CATEGORIES.some((slot) => safe[slot] !== value[slot]))
    throw Error("Você precisa resgatar o item antes de equipá-lo.");
  const { db } = getFirebaseClient();
  await confirmed(
    setDoc(doc(db, "kuroUsers", uid, "state", "equipment"), {
      ...safe,
      updatedAt: serverTimestamp(),
    }),
  );
}
async function confirmed<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              Error(
                "A confirmação está demorando. Confira a conexão e tente novamente.",
              ),
            ),
          15000,
        );
      }),
    ]);
  } catch (e) {
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      String(e.code).includes("permission-denied")
    )
      throw Error(
        "Não foi possível confirmar. Confira sua conta e o período do evento.",
      );
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
