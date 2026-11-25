import {
  GoogleAuthProvider,
  linkWithPopup,
  reauthenticateWithPopup,
  type User,
} from 'firebase/auth';
import { getFirebaseClient } from './client';

export type DriveSlot = 'avatar' | 'banner' | 'backup';

export async function connectProfileDrive(user: User) {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/drive.appdata');
  const linked = user.providerData.some((p) => p.providerId === 'google.com');
  const result = linked
    ? await reauthenticateWithPopup(user, provider)
    : await linkWithPopup(user, provider);
  const token = GoogleAuthProvider.credentialFromResult(result)?.accessToken;
  if (!token || result.user.uid !== user.uid)
    throw new Error('Autorize o acesso do YOMI ao Drive.');
  return new ProfileDrive(user.uid, token);
}

class ProfileDrive {
  constructor(
    private uid: string,
    private token: string,
  ) {}

  private async request(url: string, init: RequestInit = {}) {
    if (getFirebaseClient().auth.currentUser?.uid !== this.uid)
      throw new Error('A conta mudou. Conecte o Drive novamente.');
    const response = await fetch(url, {
      ...init,
      headers: { ...init.headers, Authorization: 'Bearer ' + this.token },
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => null);
      if (detail?.error?.errors?.some((item: {reason?: string}) => item.reason === 'storageQuotaExceeded'))
        throw new Error('Seu Google Drive está cheio.');
      throw new Error(
        response.status === 401
          ? 'A sessão expirou. Reconecte o Drive.'
          : 'O Drive recusou a operação. Confira a permissão e o espaço disponível.',
      );
    }
    return response;
  }

  private name(slot: DriveSlot) {
    return 'yomi-' + this.uid + '-' + slot;
  }

  private async find(slot: DriveSlot) {
    const params = new URLSearchParams({
      spaces: 'appDataFolder',
      q: "trashed = false and name = '" + this.name(slot) + "'",
      fields: 'files(id)',
      orderBy: 'modifiedTime desc',
      pageSize: '1',
    });
    const result = await this.request(
      'https://www.googleapis.com/drive/v3/files?' + params,
    );
    return (await result.json()).files[0]?.id as string | undefined;
  }

  async save(slot: DriveSlot, blob: Blob) {
    if (blob.size > 16 * 1024 * 1024)
      throw new Error('O limite por arquivo no Drive é 16 MiB.');
    const id = await this.find(slot);
    const base = 'https://www.googleapis.com/upload/drive/v3/files';
    if (id) {
      await this.request(
        base + '/' + encodeURIComponent(id) + '?uploadType=media',
        { method: 'PATCH', body: blob },
      );
    } else {
      const boundary = crypto.randomUUID();
      const metadata = {
        name: this.name(slot),
        parents: ['appDataFolder'],
        mimeType: blob.type,
      };
      const body = new Blob([
        '--' + boundary + '\r\nContent-Type: application/json\r\n\r\n',
        JSON.stringify(metadata),
        '\r\n--' + boundary + '\r\nContent-Type: ' + blob.type + '\r\n\r\n',
        blob,
        '\r\n--' + boundary + '--\r\n',
      ]);
      await this.request(base + '?uploadType=multipart', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
        body,
      });
    }
  }

  async read(slot: DriveSlot) {
    const id = await this.find(slot);
    return id
      ? (
          await this.request(
            'https://www.googleapis.com/drive/v3/files/' +
              encodeURIComponent(id) +
              '?alt=media',
          )
        ).blob()
      : null;
  }
}
