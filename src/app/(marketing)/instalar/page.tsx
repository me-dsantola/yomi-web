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
    title: "1. Baixar o Instalador",
    icon: Download,
    badge: "Android Moderno (64-bit)",
    summary:
      "Baixe a versão recomendada diretamente na página de downloads oficial.",
    details: [
      "A opção Padrão (64-bit) funciona na imensa maioria dos celulares Android atuais.",
      "No navegador do celular, toque em Baixar e aguarde a conclusão do arquivo (~53 MB).",
      "Caso apareça o aviso padrão do navegador para aplicativos fora da loja, toque em 'Fazer o download mesmo assim'.",
    ],
  },
  {
    step: 2,
    title: "2. Autorizar a Instalação",
    icon: Lock,
    badge: "Permissão Única",
    summary:
      "No Android, basta conceder permissão uma única vez ao seu navegador para concluir a instalação.",
    details: [
      "Toque na notificação de download concluído para abrir o instalador do Android.",
      "Se for sua primeira instalação fora da loja, toque em 'Configurações'.",
      "Ative a opção 'Permitir desta fonte' e volte uma tela.",
    ],
  },
  {
    step: 3,
    title: "3. Abrir e Sincronizar",
    icon: Smartphone,
    badge: "Pronto para Ler",
    summary:
      "Finalize a instalação, abra o YOMI e entre com sua conta Google para manter tudo salvo na nuvem.",
    details: [
      "Toque em 'Instalar' e aguarde alguns instantes.",
      "No aplicativo, acesse seu Perfil para conectar sua conta Google ou restaurar um arquivo .kuro.",
      "Sua biblioteca passa a sincronizar automaticamente entre o celular e este site.",
    ],
  },
  {
    step: 4,
    title: "4. Atualizar Sem Perder Nada",
    icon: RefreshCw,
    badge: "Atualização Segura",
    summary:
      "Nunca desinstale o aplicativo antigo antes de atualizar. Instale a nova versão diretamente por cima.",
    details: [
      "Todas as atualizações oficiais compartilham a mesma assinatura digital.",
      "Ao abrir o novo arquivo baixado e tocar em 'Atualizar', seus favoritos, capítulos salvos e Blobatar ficam intactos.",
      "O próprio aplicativo avisa quando uma nova versão está disponível.",
    ],
  },
];

const FAQS = [
  {
    q: "Qual opção devo escolher para o meu aparelho?",
    a: "Escolha 'Android Moderno (64-bit)'. Quase todos os smartphones modernos (Samsung Galaxy, Motorola, Xiaomi, Asus, Google Pixel) são 64-bit. Use 'Android Antigo (32-bit)' apenas em aparelhos bem antigos caso o instalador recuse a opção padrão, e 'PC / Emulador' somente em emuladores ou Chromebooks.",
  },
  {
    q: "Por que o navegador ou o Android exibe um aviso antes de instalar?",
    a: "Esse alerta é padrão no Android para qualquer aplicativo baixado fora da Play Store. Todos os pacotes distribuídos neste portal oficial são verificados digitalmente com hash SHA-256 para garantir autenticidade.",
  },
  {
    q: "Se eu atualizar por cima do aplicativo atual, perco meus favoritos ou histórico?",
    a: "Não! Desde que você baixe o arquivo oficial desta página e toque em 'Atualizar' sem desinstalar a versão anterior, todos os seus dados, capítulos offline e preferências são mantidos.",
  },
  {
    q: "Apareceu mensagem de pacote inválido ou conflito ao atualizar. Como resolver?",
    a: "Isso geralmente ocorre se você selecionou uma versão incompatível com o processador do aparelho ou possui uma versão muito antiga de testes. Antes de reinstalar, faça backup da sua biblioteca na nuvem ou salve um arquivo .kuro nas configurações do app.",
  },
  {
    q: "Como funciona a sincronização entre o celular e o portal web?",
    a: "Ao entrar com a mesma conta Google no aplicativo e no portal web, seus favoritos, progresso de leitura, listas e Blobatar ficam sincronizados com segurança e isolamento individual por conta.",
  },
  {
    q: "O que é o arquivo .kuro?",
    a: "É o formato de backup portátil do YOMI. Ele reúne seus favoritos, histórico recente, coleções e configurações pessoais em um único arquivo fácil de salvar ou restaurar a qualquer momento.",
  },
  {
    q: "Existe versão nativa para iPhone (iOS)?",
    a: "O aplicativo dedicado está disponível para Android. No iPhone, iPad ou computador, você pode usar livremente o Catálogo Web e o Leitor pelo navegador com sincronização completa da sua conta.",
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
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
          Instalação Rápida no Android
        </h1>
        <p className="text-sm sm:text-base text-white/60">
          Quatro passos diretos para instalar ou atualizar o YOMI mantendo sua biblioteca intacta.
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
                  Garantia de Integridade
                </h3>
                <p className="text-xs text-white/55">
                  Assinatura oficial verificada
                </p>
              </div>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              Você pode conferir o checksum SHA-256 do arquivo baixado na página de downloads para confirmar a autenticidade do pacote.
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
