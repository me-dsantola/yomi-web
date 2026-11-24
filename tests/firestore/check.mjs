import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  runTransaction,
  writeBatch,
  getDocs,
  collection,
} from "firebase/firestore";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const production = readFileSync(
  new URL("../../firestore.rules", import.meta.url),
  "utf8",
);
// Isolated test-only endpoint exercises the actual annual predicate with arbitrary dates.
// It is never written to the production rules file.
const at = production.lastIndexOf("  }");
const harness =
  production.slice(0, at) +
  `match /calendarChecks/{id} { allow create: if seasonalClaim(request.resource.data.itemId,request.resource.data.at); }\n` +
  production.slice(at);
const env = await initializeTestEnvironment({
  projectId: "demo-yomi-kuro",
  firestore: { host: "127.0.0.1", port: 8780, rules: harness },
});
try {
  const alice = env.authenticatedContext("alice").firestore(),
    bob = env.authenticatedContext("bob").firestore(),
    anon = env.unauthenticatedContext().firestore();

  const workId = '11111111-1111-4111-8111-111111111111';
  const rate = (db, uid, score, count, total, overrides = {}) => {
    const batch = writeBatch(db);
    batch.set(doc(db, 'workRatings', workId, 'votes', uid), { score, updatedAt: serverTimestamp() });
    batch.set(doc(db, 'workRatings', workId), {
      workId, count, total, rankScore: (total + 17.5) / (count + 5),
      updatedAt: serverTimestamp(), ...overrides,
    });
    return batch.commit();
  };
  await assertFails(rate(anon, 'alice', 5, 1, 5));
  await assertFails(rate(bob, 'alice', 5, 1, 5));
  await assertFails(rate(alice, 'alice', 6, 1, 6));
  await assertFails(rate(alice, 'alice', 2.5, 1, 2.5));
  await assertFails(setDoc(doc(alice, 'workRatings', workId, 'votes', 'alice'), { score: 5, updatedAt: serverTimestamp() }));
  await assertSucceeds(rate(alice, 'alice', 5, 1, 5));
  await assertSucceeds(getDoc(doc(anon, 'workRatings', workId)));
  await assertFails(getDoc(doc(bob, 'workRatings', workId, 'votes', 'alice')));
  await assertFails(rate(alice, 'alice', 4, 2, 9));
  await assertFails(rate(alice, 'alice', 4, 1, 4, { rankScore: 100 }));
  await assertSucceeds(rate(alice, 'alice', 3, 1, 3));
  await assertSucceeds(rate(bob, 'bob', 5, 2, 8));
  await assertFails(deleteDoc(doc(alice, 'workRatings', workId, 'votes', 'alice')));
  await assertFails(setDoc(doc(alice, 'workRatings', workId), { workId, count: 1000, total: 5000, rankScore: 5, updatedAt: serverTimestamp() }));
  assert.equal((await getDoc(doc(alice, 'workRatings', workId))).data().count, 2);
  console.log('PASS: authenticated ratings, score bounds, private votes, atomic aggregates, editable votes and forged ranking rejection');

  const item = (db, uid, id) => doc(db, "kuroUsers", uid, "items", id);
  const grant = (id) => ({ itemId: id, claimedAt: serverTimestamp() });
  await assertFails(setDoc(item(anon, "alice", "aurora"), grant("aurora")));
  await assertFails(setDoc(item(bob, "alice", "aurora"), grant("aurora")));
  await assertSucceeds(setDoc(item(alice, "alice", "aurora"), grant("aurora")));
  await assertFails(setDoc(item(alice, "alice", "aurora"), grant("aurora")));
  await assertFails(deleteDoc(item(alice, "alice", "aurora")));
  await assertFails(getDoc(item(bob, "alice", "aurora")));
  await assertFails(setDoc(item(alice, "alice", "unknown"), grant("unknown")));
  await assertFails(
    setDoc(item(alice, "alice", "little_star"), {
      itemId: "little_star",
      claimedAt: Timestamp.fromMillis(0),
    }),
  );
  await assertFails(
    setDoc(item(alice, "alice", "little_star"), {
      ...grant("little_star"),
      override: "christmas",
    }),
  );
  const equipment = {
    aura: "aurora",
    scarf: "",
    hat: "",
    floating: "",
    updatedAt: serverTimestamp(),
  };
  const eq = doc(alice, "kuroUsers", "alice", "state", "equipment");
  await assertSucceeds(setDoc(eq, equipment));
  await assertFails(setDoc(eq, { ...equipment, hat: "santa_hat" }));
  await assertFails(setDoc(eq, { ...equipment, hat: "aurora" }));
  await assertFails(setDoc(eq, { ...equipment, owned: ["santa_hat"] }));
  await assertSucceeds(
    setDoc(doc(alice, "users", "alice"), { owned: ["santa_hat"] }),
  );
  await assertFails(setDoc(eq, { ...equipment, hat: "santa_hat" }));
  await env.withSecurityRulesDisabled(async (c) => {
    for (const id of ["winter_scarf", "santa_hat", "tiny_book"])
      await setDoc(item(c.firestore(), "alice", id), {
        itemId: id,
        claimedAt: Timestamp.fromMillis(0),
      });
  });
  await assertSucceeds(
    setDoc(eq, {
      ...equipment,
      hat: "santa_hat",
      scarf: "winter_scarf",
      floating: "tiny_book",
    }),
  );
  await assertSucceeds(setDoc(eq, { ...equipment, aura: "" }));
  await assertFails(
    getDoc(doc(bob, "kuroUsers", "alice", "state", "equipment")),
  );
  await Promise.all(
    Array.from({ length: 5 }, () =>
      runTransaction(alice, async (tx) => {
        const ref = item(alice, "alice", "little_star");
        if (!(await tx.get(ref)).exists()) tx.set(ref, grant("little_star"));
      }),
    ),
  );
  assert.equal(
    (
      await getDocs(collection(alice, "kuroUsers", "alice", "items"))
    ).docs.filter((d) => d.id === "little_star").length,
    1,
  );
  let n = 0;
  for (const [itemId, date, allowed] of [
    ["santa_hat", "2026-12-01T02:59:59Z", false],
    ["santa_hat", "2026-12-01T03:00:00Z", true],
    ["santa_hat", "2027-01-01T02:59:59Z", true],
    ["santa_hat", "2027-01-01T03:00:00Z", false],
    ["witch_hat", "2026-10-15T02:59:59Z", false],
    ["witch_hat", "2026-10-15T03:00:00Z", true],
    ["witch_hat", "2026-11-01T03:00:00Z", false],
    ["golden_aura", "2026-12-28T03:00:00Z", true],
    ["golden_aura", "2027-01-08T02:59:59Z", true],
    ["golden_aura", "2027-01-08T03:00:00Z", false],
    ["tiny_book", "2027-04-18T03:00:00Z", true],
    ["tiny_book", "2027-04-25T03:00:00Z", false],
    ["santa_hat", "2030-12-24T03:00:00Z", true],
  ]) {
    const action = setDoc(doc(alice, "calendarChecks", "case" + n++), {
      itemId,
      at: Timestamp.fromDate(new Date(date)),
    });
    await (allowed ? assertSucceeds(action) : assertFails(action));
  }
  const today = new Date(Date.now() - 3 * 3600000),
    month = today.getUTCMonth() + 1;
  const unavailable = month === 12 ? "witch_hat" : "santa_hat";
  await assertFails(setDoc(item(bob, "bob", unavailable), grant(unavailable)));
  console.log(
    "PASS: immutable grants, account isolation, slot ownership, duplicate claims, backup forgery, annual windows and UTC-03 boundaries",
  );
} finally {
  await env.cleanup();
}
