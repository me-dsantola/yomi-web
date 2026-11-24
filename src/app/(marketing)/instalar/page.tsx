"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Download,
  ShieldCheck,
  Smartphone,
  RefreshCw,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  Lock,
} from "lucide-react";

const STEPS = [
  {
    step: 1,
    title: "1. Baixar o APK",
    icon: Download,
    badge: "Android 64-bit",
    summary: "Baixe a versão atual na página de downloads.",
    details: [
      "A opção Padrão (64-bit) funciona na maioria dos celulares Android.",
      "Toque em Baixar e aguarde concluir o download (~54 MB).",
      "Se o navegador exibir aviso, confirme o download.",
    ],
  },
  {
    step: 2,
    title: "2. Permitir Instalação",
    icon: Lock,
    badge: "Uma única vez",
    summary: "Autorize seu navegador a instalar aplicativos.",
    details: [
      "Abra o arquivo baixado pela notificação ou pasta Downloads.",
      "Se solicitado, toque em 'Configurações'.",
      "Ative 'Permitir desta fonte' e volte uma tela.",
    ],
  },
  {
    step: 3,
    title: "3. Abrir o App",
    icon: Smartphone,
    badge: "Pronto para usar",
    summary: "Instale e comece a ler ou conecte sua conta.",
    details: [
      "Toque em 'Instalar' e aguarde alguns segundos.",
      "No Perfil, entre com sua conta Google se quiser sincronizar na nuvem ou restaurar um backup .kuro.",
    ],
  },
  {
    step: 4,
    title: "4. Atualizar",
    icon: RefreshCw,
    badge: "Sem perder dados",
    summary: "Instale a nova versão por cima sem desinstalar a anterior.",
    details: [
      "Baixe a atualização aqui no site e toque em 'Atualizar'.",
      "Seus favoritos, histórico e downloads locais permanecem salvos.",
    ],
  },
];

const FAQS = [
  {
    q: "Qual opção escolher para o meu aparelho?",
    a: "Escolha 'Android Moderno (64-bit)', compatível com quase todos os celulares atuais. Use '32-bit' apenas em aparelhos bem antigos e 'PC / Emulador' em emuladores ou Chromebooks.",
  },
  {
    q: "Por que o Android mostra um aviso ao instalar?",
    a: "É o aviso padrão do Android para apps fora da Play Store. Cada arquivo traz hash SHA-256 oficial para conferência.",
  },
  {
    q: "Atualizar por cima apaga minha biblioteca?",
    a: "Não. Basta instalar a nova versão sem desinstalar a antiga para preservar favoritos, downloads e histórico.",
  },
  {
    q: "Deu erro de pacote inválido ao atualizar. O que fazer?",
    a: "Verifique se você baixou a arquitetura correta (64-bit ou 32-bit). Se precisar reinstalar do zero, faça backup antes na nuvem ou exporte um arquivo .kuro.",
  },
  {
    q: "Como funciona a sincronização entre app e web?",
    a: "Entrando com a mesma conta no app e no site, seus favoritos, listas, comentários e progresso ficam sincronizados.",
  },
  {
    q: "Existe versão para iPhone (iOS)?",
    a: "O app dedicado é exclusivo para Android. No iPhone ou iPad, leia diretamente pelo navegador.",
  },
];

export default function InstalarPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const current = STEPS[activeStep];
  const StepIcon = current.icon;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-28 sm:pt-32 pb-20 space-y-16">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
          Como instalar no Android
        </h1>
        <p className="text-sm sm:text-base text-white/60">
          Quatro passos rápidos para instalar ou atualizar mantendo seus dados.
        </p>
      </div>

      {/* Interactive 4-Step Tabs */}
      <section className="rounded-3xl border border-white/10 bg-[#0E0E14] p-6 sm:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 border-b border-white/[0.08] pb-6">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isSelected = idx === activeStep;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => setActiveStep(idx)}
                className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
                  isSelected
                    ? "border-[var(--yomi-accent)] bg-[var(--yomi-accent)]/10 text-white"
                    : "border-white/[0.06] bg-white/[0.02] text-white/60 hover:border-white/15 hover:text-white"
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    isSelected
                      ? "bg-[var(--yomi-accent)] text-white"
                      : "bg-white/5 text-white/70"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{s.title}</div>
                  <div className="text-[10px] text-white/45 truncate">
                    {s.badge}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Step Content */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-medium text-white/80">
              <StepIcon className="h-3.5 w-3.5 text-[var(--yomi-accent)]" />
              {current.badge}
            </div>
            <h2 className="font-display text-2xl font-bold text-white">
              {current.title}
            </h2>
            <p className="text-sm text-white/70 leading-relaxed">
              {current.summary}
            </p>
            <ul className="space-y-2.5 pt-2">
              {current.details.map((detail, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-xs sm:text-sm text-white/75"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-[#070709] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-emerald-400 shrink-0" />
              <div>
                <h3 className="font-display text-sm font-bold text-white">
                  Integridade SHA-256
                </h3>
                <p className="text-xs text-white/55">
                  Assinatura oficial verificada
                </p>
              </div>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              Confira o checksum SHA-256 na página de downloads se quiser validar o APK.
            </p>
            <div className="flex gap-2.5 pt-1">
              <Link
                href="/download"
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[var(--yomi-accent)] py-2.5 text-xs font-semibold text-white transition hover:brightness-110"
              >
                <Download className="h-3.5 w-3.5" />
                Ir para Downloads
              </Link>
              {activeStep < STEPS.length - 1 && (
                <button
                  type="button"
                  onClick={() => setActiveStep((prev) => prev + 1)}
                  className="flex-1 rounded-full border border-white/15 bg-white/5 py-2.5 text-xs font-medium text-white hover:bg-white/10"
                >
                  Próximo Passo →
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="space-y-6">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="h-6 w-6 text-[var(--yomi-accent)]" />
          <h2 className="font-display text-2xl font-bold text-white">
            Perguntas Frequentes
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-white/[0.08] bg-[#0E0E14] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-display text-sm sm:text-base font-semibold text-white hover:bg-white/[0.02]"
                  aria-expanded={isOpen}
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-white/50 transition-transform ${
                      isOpen ? "rotate-180 text-[var(--yomi-accent)]" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-white/[0.06] px-5 py-4 text-xs sm:text-sm leading-relaxed text-white/65">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
