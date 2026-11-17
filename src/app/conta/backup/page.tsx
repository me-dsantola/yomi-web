"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  FileJson,
  CloudUpload,
  ShieldCheck,
} from "lucide-react";
import { useYomiAuth } from "@/components/providers/AppProviders";
import {
  fetchUserCloudDoc,
  importKuroBackupToCloud,
  parseRawCloudDocData,
} from "@/lib/firebase/cloudSync";
import { getDemoCloudDocument } from "@/lib/firebase/demoFixture";
import {
  buildKuroFilename,
  decodeKuroBackup,
  encodeKuroBackup,
  summarizeBackup,
  type BackupSummary,
} from "@/lib/backup/kuroCodec";

export default function BackupManagerPage() {
  const { user, openAuthModal } = useYomiAuth();

  const { data: cloudState, refetch } = useQuery({
    queryKey: ["yomi-cloud-doc", user?.uid, "backup-page"],
    queryFn: async () => {
      if (!user) {
        return parseRawCloudDocData(getDemoCloudDocument(), "leitor@yomi.app");
      }
      return fetchUserCloudDoc(user.uid, user.email);
    },
  });

  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [rawFileContent, setRawFileContent] = useState<string | null>(null);
  const [previewSummary, setPreviewSummary] = useState<BackupSummary | null>(
    null
  );
  const [fileError, setFileError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  const handleExportKuro = (asBase64 = false) => {
    if (!cloudState) return;
    const content = asBase64
      ? encodeKuroBackup(cloudState.backup, true)
      : encodeKuroBackup(cloudState.backup, false);

    const blob = new Blob([content], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = buildKuroFilename();
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    setPreviewSummary(null);
    setImportSuccess(false);

    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    try {
      const text = await file.text();
      const decoded = decodeKuroBackup(text);
      const summary = summarizeBackup(decoded);
      setRawFileContent(text);
      setPreviewSummary(summary);
    } catch (err: any) {
      setFileError(
        err?.message || "Arquivo .kuro inválido ou corrompido."
      );
    }
  };

  const handleConfirmCloudImport = async () => {
    if (!user || !rawFileContent) return;
    setImporting(true);
    setFileError(null);
    try {
      await importKuroBackupToCloud(
        user.uid,
        user.email,
        user.displayName,
        rawFileContent
      );
      setImportSuccess(true);
      await refetch();
    } catch (err: any) {
      setFileError(
        err?.message || "Não foi possível gravar o backup na nuvem."
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-28 sm:pt-32 pb-20 space-y-10">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/conta"
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao Perfil
          </Link>
          <h1 className="font-display text-3xl font-extrabold text-white">
            Backups (.kuro)
          </h1>
          <p className="text-xs sm:text-sm text-white/60">
            Exporte sua biblioteca ou restaure um arquivo{" "}
            <code>.kuro</code>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* EXPORT CARD */}
        <div className="rounded-3xl border border-white/10 bg-[#0E0E14] p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FF2A55]/15 text-[#FF2A55]">
              <Download className="h-5 w-5" />
            </div>
            <h2 className="font-display text-xl font-bold text-white">
              Exportar Biblioteca (.kuro)
            </h2>
            <p className="text-xs text-white/60 leading-relaxed">
              Gera um arquivo{" "}
              <code className="text-white/85">{buildKuroFilename()}</code>{" "}
              totalmente compatível com a função &ldquo;Restaurar Backup&rdquo; do aplicativo Android YOMI.
            </p>

            {cloudState && (
              <div className="rounded-2xl border border-white/[0.07] bg-black/40 p-4 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/50">Origem:</span>
                  <span className="font-semibold text-white">
                    {user ? user.email : "Biblioteca de Demonstração"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Favoritos:</span>
                  <span className="font-mono text-white">
                    {cloudState.favoritesCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Histórico:</span>
                  <span className="font-mono text-white">
                    {cloudState.historyCount} registros
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Coleções:</span>
                  <span className="font-mono text-white">
                    {cloudState.readingListsCount}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              disabled={!cloudState}
              onClick={() => handleExportKuro(false)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[var(--yomi-accent)] py-3 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              Baixar Backup (.kuro)
            </button>
            <button
              type="button"
              disabled={!cloudState}
              onClick={() => handleExportKuro(true)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 py-2.5 text-xs font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-40"
            >
              <FileJson className="h-3.5 w-3.5" />
              Baixar Formato Compacto (.kuro)
            </button>
          </div>
        </div>

        {/* IMPORT & VALIDATE CARD */}
        <div className="rounded-3xl border border-white/10 bg-[#0E0E14] p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-400">
              <Upload className="h-5 w-5" />
            </div>
            <h2 className="font-display text-xl font-bold text-white">
              Validar &amp; Importar (.kuro)
            </h2>
            <p className="text-xs text-white/60 leading-relaxed">
              Selecione um arquivo <code>.kuro</code> do seu dispositivo para conferir os títulos salvos e sincronizá-los com sua conta na nuvem.
            </p>

            <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-black/30 p-6 text-center transition hover:border-[var(--yomi-accent)]/60 hover:bg-white/[0.02]">
              <Upload className="h-6 w-6 text-white/50 mb-2" />
              <span className="text-xs font-semibold text-white">
                {selectedFileName || "Clique para selecionar um arquivo .kuro"}
              </span>
              <span className="mt-1 text-[11px] text-white/45">
                Compatível com todas as versões do YOMI
              </span>
              <input
                type="file"
                accept=".kuro,.json,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {fileError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{fileError}</span>
              </div>
            )}

            {previewSummary && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
                  <ShieldCheck className="h-4 w-4" />
                  Backup Válido YOMI
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-white/75">
                  <div>
                    Favoritos: <strong>{previewSummary.favoritesCount}</strong>
                  </div>
                  <div>
                    Histórico: <strong>{previewSummary.historyCount}</strong>
                  </div>
                  <div>
                    Listas: <strong>{previewSummary.readingListsCount}</strong>
                  </div>
                  <div>
                    Blobatar: <strong>{previewSummary.mascotName}</strong>
                  </div>
                </div>
              </div>
            )}

            {importSuccess && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-3 text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>
                  Backup sincronizado com sucesso na sua nuvem YOMI!
                </span>
              </div>
            )}
          </div>

          {user ? (
            <button
              type="button"
              disabled={!previewSummary || importing}
              onClick={handleConfirmCloudImport}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-purple-600 py-3 text-xs font-semibold text-white transition hover:bg-purple-500 disabled:opacity-40"
            >
              <CloudUpload className="h-4 w-4" />
              {importing
                ? "Sincronizando na nuvem..."
                : "Restaurar este Backup na Minha Nuvem"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal("login")}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 py-3 text-xs font-semibold text-white hover:bg-white/10"
            >
              Entre ou crie uma conta para enviar este arquivo à nuvem
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
