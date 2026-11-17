"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useYomiAuth } from "@/components/providers/AppProviders";
import { YomiBloubCompanion } from "@/components/brand/bloub/YomiBloubCompanion";
import { useCosmetics } from "@/components/brand/bloub/useCosmetics";
import {
  CATEGORIES,
  ITEMS,
  EVENTS,
  EMPTY_EQUIPMENT,
  activeSeason,
  eventAvailable,
  equipItem,
  type Equipment,
} from "@/lib/kuro/cosmetics";
import { claimCosmetic, saveEquipment } from "@/lib/kuro/store";
export default function WardrobePage() {
  const { user, openAuthModal } = useYomiAuth(),
    wardrobe = useCosmetics();
  const action = useRef(0);
  const [preview, setPreview] = useState(false),
    [override, setOverride] = useState<string | undefined>(),
    [now, setNow] = useState(() => new Date()),
    [draft, setDraft] = useState<Equipment>(EMPTY_EQUIPMENT),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [motion, setMotion] = useState<"idle" | "orbit">("idle");
  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = setInterval(update, 60000);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  useEffect(() => {
    action.current++;
    setBusy(false);
    setNotice("");
    setPreview(false);
    setDraft(EMPTY_EQUIPMENT);
    setOverride(undefined);
  }, [user?.uid]);
  const owned = preview ? new Set(ITEMS.map((i) => i.id)) : wardrobe.owned;
  const equipment = preview ? draft : wardrobe.equipment;
  const season = activeSeason(now, preview ? override : undefined);
  const run = async (operation: () => Promise<void>) => {
    const request = ++action.current;
    setBusy(true);
    setNotice("");
    try {
      await operation();
      if (action.current === request) setNotice("Guarda-roupa atualizado.");
    } catch (e) {
      if (action.current === request)
        setNotice(
          e instanceof Error
            ? e.message
            : "Não foi possível salvar. Confira a conexão e tente novamente.",
        );
    } finally {
      if (action.current === request) setBusy(false);
    }
  };
  const choose = (id: string) => {
    const next = equipItem(equipment, id, owned);
    if (preview) setDraft(next);
    else void run(() => saveEquipment(next));
  };
  return (
    <main className="mx-auto max-w-5xl px-5 pb-16 pt-32 text-white">
      <Link href="/conta" className="text-xs text-violet-300">
        ← Meu perfil
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Guarda-roupa do Kuro</h1>
      <p className="mt-3 text-sm text-white/60">
        Sua companhia, do seu jeito. Cada item resgatado fica na sua conta,
        mesmo depois da temporada.
      </p>
      <div className="mt-7 grid gap-6 md:grid-cols-[310px_1fr]">
        <section
          style={{ borderColor: season?.accent }}
          className="h-fit rounded-3xl border border-white/10 bg-[#101529] p-5 md:sticky md:top-28"
        >
          <div className="flex justify-center py-6">
            <YomiBloubCompanion
              size={260}
              state={motion}
              context="manual"
              equipment={equipment}
            />
          </div>
          <p className="text-center text-sm">
            {season
              ? `Temporada: ${season.name}`
              : "Um bom dia para novas histórias."}
          </p>
          <button
            type="button"
            onClick={() => setMotion(motion === "idle" ? "orbit" : "idle")}
            className="mt-4 w-full rounded-xl border border-white/20 px-4 py-2 text-xs"
          >
            {motion === "idle"
              ? "Testar órbita e acessórios"
              : "Voltar ao descanso"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPreview(!preview);
              setDraft({ ...wardrobe.equipment });
              setOverride(undefined);
            }}
            className="mt-3 w-full rounded-xl bg-violet-400/20 px-4 py-2 text-xs"
          >
            {preview
              ? "Sair da experimentação"
              : "Experimentar todos os itens sem salvar"}
          </button>
          {preview && (
            <label className="mt-4 block text-xs text-white/60">
              Simular temporada
              <select
                aria-label="Simular temporada"
                value={override ?? "auto"}
                onChange={(e) =>
                  setOverride(
                    e.target.value === "auto" ? undefined : e.target.value,
                  )
                }
                className="mt-2 w-full rounded-lg bg-[#22243e] p-2"
              >
                <option value="auto">Data atual</option>
                <option value="none">Sem evento</option>
                {EVENTS.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
              <span className="mt-2 block">
                A simulação não concede itens nem altera o período de resgate.
              </span>
            </label>
          )}
          {!user && !preview && (
            <button
              type="button"
              onClick={() => openAuthModal("login")}
              className="mt-4 w-full rounded-xl bg-white px-4 py-2 text-sm text-black"
            >
              Entrar para resgatar e salvar
            </button>
          )}
          {(notice || wardrobe.error) && (
            <p role="status" className="mt-4 text-xs text-amber-200">
              {notice || wardrobe.error}
            </p>
          )}
        </section>
        <section className="space-y-5">
          {CATEGORIES.map((category) => (
            <div
              key={category}
              className="rounded-2xl border border-white/10 p-5"
            >
              <div className="flex justify-between">
                <h2 className="font-semibold">
                  {
                    {
                      aura: "Auras",
                      scarf: "Cachecóis",
                      hat: "Gorros e chapéus",
                      floating: "Objetos flutuantes",
                    }[category]
                  }
                </h2>
                <button
                  type="button"
                  disabled={busy || (!preview && !wardrobe.ready)}
                  onClick={() => {
                    const next = { ...equipment, [category]: "" };
                    if (preview) setDraft(next);
                    else if (user) void run(() => saveEquipment(next));
                  }}
                  className="text-xs text-violet-300"
                >
                  Desequipar
                </button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {ITEMS.filter((i) => i.category === category).map((item) => {
                  const has = owned.has(item.id),
                    available = eventAvailable(item.event, now),
                    equipped = equipment[category] === item.id;
                  return (
                    <article
                      key={item.id}
                      className={`rounded-xl border p-4 ${equipped ? "border-violet-300 bg-violet-400/10" : "border-white/10"}`}
                    >
                      <div
                        className="mb-3 h-1 rounded-full"
                        style={{ background: item.color }}
                      />
                      <h3 className="text-sm">{item.name}</h3>
                      <p className="mt-1 text-xs text-white/50">
                        {item.event === "always"
                          ? "Presente de boas-vindas"
                          : EVENTS.find((e) => e.id === item.event)?.name}{" "}
                        ·{" "}
                        {has
                          ? "No seu guarda-roupa"
                          : available
                            ? "Resgate disponível"
                            : "Aguarde a temporada"}
                      </p>
                      <button
                        type="button"
                        disabled={
                          busy ||
                          equipped ||
                          (!has && !available) ||
                          (!preview && Boolean(user) && !wardrobe.ready)
                        }
                        onClick={() => {
                          if (has) choose(item.id);
                          else if (!user) openAuthModal("login");
                          else void run(() => claimCosmetic(item.id));
                        }}
                        className="mt-4 rounded-lg bg-white/10 px-3 py-2 text-xs disabled:opacity-40"
                      >
                        {equipped
                          ? "Equipado"
                          : has
                            ? "Vestir"
                            : available
                              ? "Resgatar"
                              : "Indisponível"}
                      </button>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
