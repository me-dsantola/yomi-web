"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Shuffle } from "lucide-react";
import {
  BlobatarCompanion,
  BLOBATAR_EXPRESSIONS,
  BLOBATAR_SHAPES,
} from "@/components/brand/BlobatarCompanion";

const HUE_SWATCHES = [
  { label: "Carmesim", hue: 348, color: "#FF2A55" },
  { label: "Violeta", hue: 265, color: "#8B5CF6" },
  { label: "Ciano", hue: 190, color: "#06B6D4" },
  { label: "Esmeralda", hue: 156, color: "#10B981" },
  { label: "Âmbar", hue: 36, color: "#F59E0B" },
];

const QUICK_EXPRESSIONS = [
  "happy",
  "love",
  "wink",
  "surprised",
  "thinking",
  "smug",
  "sleepy",
  "mad",
];

export function BlobatarInteractiveShowcase() {
  const [seedInput, setSeedInput] = useState("YOMI");
  const [selectedShape, setSelectedShape] = useState("auto");
  const [selectedExpr, setSelectedExpr] = useState("happy");
  const [selectedHue, setSelectedHue] = useState<number>(348);

  const randomize = () => {
    const randomNames = [
      "Kira",
      "Sora",
      "Denji",
      "Frieren",
      "Jinwoo",
      "Casca",
      "Luffy",
      "Gojo",
    ];
    setSeedInput(randomNames[Math.floor(Math.random() * randomNames.length)]);
    setSelectedShape(
      BLOBATAR_SHAPES[Math.floor(Math.random() * BLOBATAR_SHAPES.length)].id
    );
    setSelectedExpr(
      QUICK_EXPRESSIONS[Math.floor(Math.random() * QUICK_EXPRESSIONS.length)]
    );
    setSelectedHue(
      HUE_SWATCHES[Math.floor(Math.random() * HUE_SWATCHES.length)].hue
    );
  };

  return (
    <section className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 py-16 sm:py-20">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#0B0B10] p-6 sm:p-10 lg:p-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full blur-3xl opacity-35 transition-colors duration-700"
          style={{
            backgroundColor: `hsl(${selectedHue}, 82%, 55%)`,
          }}
        />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Interactive Blobatar Stage */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center rounded-3xl border border-white/[0.07] bg-[#070709]/80 p-8 sm:p-12">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45 }}
              className="relative flex flex-col items-center"
            >
              <BlobatarCompanion
                seed={seedInput || "YOMI"}
                mascotName={seedInput || "YOMI"}
                hue={selectedHue}
                shape={selectedShape}
                expression={selectedExpr}
                background="squircle"
                size={190}
                followPointer
                interactiveCycle
              />

              <span className="mt-6 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[11px] text-white/60">
                Clique no mascote para interagir
              </span>
            </motion.div>
          </div>

          {/* Concise Visual Customizer */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1 text-xs font-medium text-white/75">
                Identidade do Leitor
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Seu companheiro único de leitura.
              </h2>
            </div>

            {/* Name + Randomize */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label
                  htmlFor="blobatar-name-input"
                  className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/45"
                >
                  Nome ou apelido
                </label>
                <input
                  id="blobatar-name-input"
                  type="text"
                  maxLength={28}
                  value={seedInput}
                  onChange={(e) => setSeedInput(e.target.value)}
                  placeholder="Ex: YOMI"
                  className="w-full rounded-2xl border border-white/12 bg-[#12121A] px-4 py-3 text-sm font-medium text-white placeholder:text-white/30 focus:border-[var(--yomi-accent)] focus:outline-none"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={randomize}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.05] px-5 py-3 text-xs font-semibold text-white transition hover:bg-white/10"
                >
                  <Shuffle className="h-4 w-4 text-[var(--yomi-accent)]" />
                  Aleatório
                </button>
              </div>
            </div>

            {/* Hue Picker */}
            <div className="space-y-2">
              <span className="block text-[11px] font-medium uppercase tracking-wider text-white/45">
                Paleta Ambiente
              </span>
              <div className="flex flex-wrap gap-2.5">
                {HUE_SWATCHES.map((swatch) => {
                  const active = selectedHue === swatch.hue;
                  return (
                    <button
                      key={swatch.label}
                      type="button"
                      onClick={() => setSelectedHue(swatch.hue)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                        active
                          ? "border-white/50 bg-white/10 text-white"
                          : "border-white/[0.08] bg-white/[0.02] text-white/60 hover:text-white"
                      }`}
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: swatch.color }}
                      />
                      {swatch.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Expression Picker */}
            <div className="space-y-2">
              <span className="block text-[11px] font-medium uppercase tracking-wider text-white/45">
                Expressão
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_EXPRESSIONS.map((exprId) => {
                  const meta = BLOBATAR_EXPRESSIONS.find(
                    (e) => e.id === exprId
                  );
                  if (!meta) return null;
                  const active = selectedExpr === exprId;
                  return (
                    <button
                      key={exprId}
                      type="button"
                      onClick={() => setSelectedExpr(exprId)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        active
                          ? "bg-white text-black font-semibold"
                          : "border border-white/[0.08] bg-white/[0.03] text-white/65 hover:text-white"
                      }`}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Shape Picker */}
            <div className="space-y-2">
              <span className="block text-[11px] font-medium uppercase tracking-wider text-white/45">
                Formato
              </span>
              <div className="flex flex-wrap gap-1.5">
                {BLOBATAR_SHAPES.slice(0, 7).map((s) => {
                  const active = selectedShape === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedShape(s.id)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        active
                          ? "bg-[var(--yomi-accent)] text-white font-semibold"
                          : "border border-white/[0.08] bg-white/[0.02] text-white/60 hover:text-white"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
