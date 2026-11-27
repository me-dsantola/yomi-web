'use client';
import { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  connectProfileDrive,
  type DriveSlot,
} from '@/lib/firebase/profileDrive';
import {
  updateCloudUserProfile,
  type ParsedYomiCloudState,
} from '@/lib/firebase/cloudSync';

type Slot = Exclude<DriveSlot, 'backup'>;
type Props = {
  user: User;
  state: ParsedYomiCloudState;
  refresh: () => Promise<unknown>;
  onMedia: (slot: Slot, url: string) => void;
};

async function preview(file: File, slot: Slot) {
  if (
    !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)
  )
    throw new Error('Escolha uma imagem JPG, PNG, WebP ou GIF.');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    if (file.size <= 64 * 1024)
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    const scale = Math.min(
      1,
      (slot === 'avatar' ? 384 : 800) / Math.max(img.width, img.height),
    );
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Falha ao preparar imagem.');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.6, 0.4, 0.2]) {
      const data = canvas.toDataURL('image/jpeg', quality);
      if (data.length < 85000) return data;
    }
    throw new Error('Escolha uma imagem com dimensões menores.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ProfileStorage({ user, state, refresh, onMedia }: Props) {
  const [drive, setDrive] = useState<Awaited<
    ReturnType<typeof connectProfileDrive>
  > | null>(null);
  const [linked, setLinked] = useState(false);
  useEffect(() => {
    try { setLinked(localStorage.getItem('yomi-drive-linked:' + user.uid) === '1'); } catch {}
    try { setStatus(localStorage.getItem('yomi-drive-warning:' + user.uid) || ''); } catch {}
  }, [user.uid]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const urls = useRef<string[]>([]);
  useEffect(() => {
    const held = urls.current;
    return () => held.forEach((url) => URL.revokeObjectURL(url));
  }, []);
  function show(slot: Slot, blob: Blob) {
    const url = URL.createObjectURL(blob);
    urls.current.push(url);
    onMedia(slot, url);
  }
  async function run(action: () => Promise<string>) {
    if (busy) return;
    setBusy(true);
    try {
      setStatus(await action());
    } catch (e) {
      setStatus(
        e instanceof Error ? e.message : 'A operação falhou. Tente novamente.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function connect() {
    const session = await connectProfileDrive(user);
    setDrive(session);
    setLinked(true);
    try { localStorage.setItem('yomi-drive-linked:' + user.uid, '1'); } catch {}
    return session;
  }
  async function loadOriginals() {
    const connected = drive ?? await connect();
    let found = false;
    await Promise.all(
      (['avatar', 'banner'] as const).map(async (slot) => {
        const blob = await connected.read(slot);
        if (blob) {
          show(slot, blob);
          found = true;
        }
      }),
    );
    return found ? 'Originais carregados.' : 'Nenhuma foto arquivada no Drive.';
  }
  async function upload(slot: Slot, file: File) {
    if (file.size > 16 * 1024 * 1024)
      throw new Error('Escolha uma imagem de até 16 MiB.');
    const connection = drive ? Promise.resolve(drive) : linked ? connect() : null;
    // Handle a dismissed popup while the compact image is being prepared.
    const attempt = connection?.then(session => ({session}), (error: unknown) => ({error}));
    const small = await preview(file, slot);
    let warning = '';
    let archived = false;
    if (attempt) {
      try {
        const result = await attempt;
        if ('error' in result) throw result.error;
        await result.session.save(slot, file);
        archived = true;
      } catch (error) {
        warning = error instanceof Error ? error.message : 'Drive indisponível.';
      }
    }
    try {
    await updateCloudUserProfile(
      user.uid,
      user.email,
      slot === 'avatar' ? { useBlobatarAsAvatar: false, avatarImagePath:'' } : {bannerImagePath:''},
      { slot, base64: small.split(',')[1] },
    );
    } catch (error) {
      throw new Error([warning, archived ? 'Original salvo no Drive.' : '', error instanceof Error ? error.message : 'Falha ao sincronizar.'].filter(Boolean).join(' '));
    }
    await refresh();
    if (archived) show(slot, file);
    else onMedia(slot, small);
    const warningKey = 'yomi-drive-warning:' + user.uid;
    try {
      if (warning) localStorage.setItem(warningKey, warning + ' Imagem compacta salva no perfil.');
      else if (archived) localStorage.removeItem(warningKey);
    } catch {}
    if (warning) return warning + ' Imagem compacta salva no perfil.';
    return archived
      ? 'Original salvo no Drive e prévia sincronizada.'
      : 'Imagem compacta salva.';
  }
  const button =
    'rounded-full border border-white/20 px-4 py-2 text-sm disabled:opacity-50';
  return (
    <section className="space-y-3 border-t border-white/10 p-6">
      <h2 className="font-semibold text-white">Fotos e armazenamento</h2>
      <p className="text-sm text-white/70">
        Com e-mail e senha, foto e banner usam até 64 KiB cada. GIFs maiores
        viram imagens estáticas. Conecte seu Google para guardar originais de
        até 16 MiB e backups no seu Drive.
      </p>
      <fieldset disabled={busy} className="flex flex-wrap gap-2">
        <button className={button} onClick={() => void run(async () => { await connect(); return 'Drive conectado.'; })}>
          {drive ? 'Reconectar Drive' : linked ? 'Drive vinculado · renovar acesso' : 'Conectar Google Drive'}
        </button>
        {(['avatar', 'banner'] as const).map((slot) => (
          <label
            key={slot}
            className={button + ' relative cursor-pointer focus-within:ring-2'}
          >
            {slot === 'avatar' ? 'Alterar foto' : 'Alterar banner'}
            <input
              type="file"
              aria-label={slot === 'avatar' ? 'Alterar foto' : 'Alterar banner'}
              className="absolute inset-0 w-full cursor-pointer opacity-0"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void run(() => upload(slot, file));
              }}
            />
          </label>
        ))}
        {(linked || drive) && (
          <>
            <button className={button} onClick={() => void run(loadOriginals)}>
              Usar originais do Drive
            </button>
            <button
              className={button}
              onClick={() =>
                void run(async () => {
                  try {
                  const connected = drive ?? await connect();
                  await connected.save(
                    'backup',
                    new Blob([state.rawPayload], {
                      type: 'application/octet-stream',
                    }),
                  );
                  } catch (error) {
                    const url = URL.createObjectURL(new Blob([state.rawPayload]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'yomi-backup.kuro';
                    link.click();
                    setTimeout(() => URL.revokeObjectURL(url), 30000);
                    return (error instanceof Error ? error.message : 'Drive indisponível.') + ' Download da cópia local iniciado.';
                  }
                  return 'Backup salvo no Drive.';
                })
              }
            >
              Salvar backup no Drive
            </button>
            <button
              className={button}
              onClick={() =>
                void run(async () => {
                  const connected = drive ?? await connect();
                  const blob = await connected.read('backup');
                  if (!blob) return 'Nenhum backup no Drive.';
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'yomi-drive.kuro';
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 30000);
                  return 'Backup baixado. Para restaurar, abra Backup (.kuro).';
                })
              }
            >
              Baixar backup
            </button>
          </>
        )}
      </fieldset>
      <p role="status" className="text-sm text-white/75">
        {busy ? 'Aguarde…' : status}
      </p>
    </section>
  );
}
