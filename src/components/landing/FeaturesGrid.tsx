import React from "react";
import {
  Smartphone,
  Moon,
  Sparkles,
  Cloud,
  WifiOff,
  Compass,
  FolderHeart,
  ShieldCheck,
} from "lucide-react";

const FEATURES = [
  {
    icon: Smartphone,
    title: "Leitor Híbrido (Mangá & Webtoon)",
    description:
      "Rolagem vertical contínua sem frestas para Manhwas e Webtoons, ou modo paginado (RTL/LTR) com zoom duplo-toque para Mangás tradicionais.",
    accent: "#FF2A55",
  },
  {
    icon: Moon,
    title: "Estética AMOLED Pura",
    description:
      "Preto absoluto (#070709) que desliga pixels em telas OLED, economiza bateria real e elimina a fadiga visual na leitura noturna.",
    accent: "#8B5CF6",
  },
  {
    icon: Sparkles,
    title: "Blobatar Companion",
    description:
      "Seu mascote interativo no perfil que evolui de acordo com os capítulos lidos, reage à sua cor de acento favorita e celebra suas conquistas.",
    accent: "#06B6D4",
  },
  {
    icon: Cloud,
    title: "Cloud Sync & Backups .kuro",
    description:
      "Sincronização na nuvem via Google (Firebase) compartilhada com este portal web e exportação/importação de arquivos .kuro v4.",
    accent: "#10B981",
  },
  {
    icon: WifiOff,
    title: "Downloads Offline no Android",
    description:
      "Baixe capítulos completos em fila no celular para ler no metrô, avião ou onde não houver conexão.",
    accent: "#FF2A55",
  },
  {
    icon: Compass,
    title: "Descoberta Inteligente",
    description:
      "Destaques rotativos com 5 obras populares aleatórias a cada ciclo, filtros por demografia e busca multilíngue integrada ao MangaDex.",
    accent: "#8B5CF6",
  },
  {
    icon: FolderHeart,
    title: "Coleções Personalizadas",
    description:
      "Organize suas leituras em listas customizadas além dos favoritos, com histórico automático por página e capítulo.",
    accent: "#06B6D4",
  },
  {
    icon: ShieldCheck,
    title: "Zero Anúncios, 100% Gratuito",
    description:
      "Sem pop-ups invasivos, sem rastreadores comerciais e com verificação pública de integridade SHA-256 em cada APK.",
    accent: "#10B981",
  },
];

export function FeaturesGrid() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1 text-xs font-medium text-white/75">
          Engenharia Focada em Leitura
        </span>
        <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
          Tudo o que importa na página. Nada no seu caminho.
        </h2>
        <p className="mt-3 text-sm sm:text-base text-white/60">
          Leitura fluida a 120Hz no Android integrada em tempo real ao portal web.
        </p>
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
