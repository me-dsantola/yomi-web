import React from "react";
import {
  Smartphone,
  Moon,
  Palette,
  Cloud,
  WifiOff,
  Compass,
  FolderHeart,
  ShieldCheck,
} from "lucide-react";

const FEATURES = [
  {
    icon: Smartphone,
    title: "Mangá & Webtoon",
    description:
      "Rolagem vertical contínua ou modo paginado (RTL/LTR) com zoom duplo-toque.",
    accent: "#FF2A55",
  },
  {
    icon: Moon,
    title: "Preto AMOLED",
    description:
      "Fundo escuro puro (#070709) pensado para conforto visual na leitura noturna.",
    accent: "#8B5CF6",
  },
  {
    icon: Palette,
    title: "Blobatar",
    description:
      "Mascote personalizável no perfil que evolui conforme você lê novos capítulos.",
    accent: "#06B6D4",
  },
  {
    icon: Cloud,
    title: "Nuvem & Backup .kuro",
    description:
      "Sincronização entre celular e navegador, além de exportação portátil .kuro v4.",
    accent: "#10B981",
  },
  {
    icon: WifiOff,
    title: "Leitura Offline",
    description:
      "Baixe capítulos no app Android para ler quando estiver sem conexão.",
    accent: "#FF2A55",
  },
  {
    icon: Compass,
    title: "Catálogo Integrado",
    description:
      "Busca rápida por título, filtros de gênero e idioma integrados ao MangaDex.",
    accent: "#8B5CF6",
  },
  {
    icon: FolderHeart,
    title: "Coleções",
    description:
      "Organize suas obras em listas personalizadas, favoritos e histórico.",
    accent: "#06B6D4",
  },
  {
    icon: ShieldCheck,
    title: "Zero Anúncios",
    description:
      "Gratuito, sem pop-ups invasivos e com verificação SHA-256 oficial.",
    accent: "#10B981",
  },
];

export function FeaturesGrid() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1 text-xs font-medium text-white/75">
          Recursos
        </span>
        <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
          Tudo o que importa na página. Nada no caminho.
        </h2>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="group relative rounded-2xl border border-white/[0.08] bg-[#0E0E14] p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-[#14141C]"
            >
              <div
                className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10"
                style={{
                  backgroundColor: `${item.accent}18`,
                  color: item.accent,
                }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-base font-bold text-white">
                {item.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-white/60">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
