import { afterEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { connectProfileDrive } from '@/lib/firebase/profileDrive';

const session = vi.hoisted(() => ({
  currentUser: { uid: 'reader' },
  link: vi.fn(),
  reauth: vi.fn(),
  scope: vi.fn(),
}));
vi.mock('@/lib/firebase/client', () => ({
  getFirebaseClient: () => ({ auth: session }),
}));
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {
    addScope = session.scope;
    static credentialFromResult() {
      return { accessToken: 'synthetic' };
    }
  },
  linkWithPopup: session.link,
  reauthenticateWithPopup: session.reauth,
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  session.currentUser.uid = 'reader';
});
describe('Private Drive storage', () => {
  it('links the current password account and creates a private file with the original bytes', async () => {
    const user = {
      uid: 'reader',
      providerData: [{ providerId: 'password' }],
    } as User;
    session.link.mockResolvedValue({ user });
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ files: [] }))
      .mockResolvedValueOnce(Response.json({ id: '1' }));
    vi.stubGlobal('fetch', fetch);
    const drive = await connectProfileDrive(user);
    await drive.save('avatar', new Blob(['GIF89a'], { type: 'image/gif' }));
    expect(session.scope).toHaveBeenCalledWith(
      'https://www.googleapis.com/auth/drive.appdata',
    );
    expect(session.link).toHaveBeenCalledOnce();
    const body = await fetch.mock.calls[1][1].body.text();
    expect(body).toContain('"parents":["appDataFolder"]');
    expect(body).toContain('yomi-reader-avatar');
    expect(body).toContain('GIF89a');
  });
  it('reports a full Drive before attempting the upload', async () => {
    const user = { uid: 'reader', providerData: [] } as unknown as User;
    session.link.mockResolvedValue({user});
    const fetch = vi.fn().mockResolvedValue(Response.json({
      error: {errors: [{reason:'storageQuotaExceeded'}]},
    }, {status:403}));
    vi.stubGlobal('fetch', fetch);
    const drive = await connectProfileDrive(user);
    await expect(drive.save('avatar', new Blob(['photo']))).rejects.toThrow('Google Drive está cheio');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('updates an existing backup and stops using the session after an account change', async () => {
    const user = {
      uid: 'reader',
      providerData: [{ providerId: 'google.com' }],
    } as User;
    session.reauth.mockResolvedValue({ user });
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ files: [{ id: 'existing' }] }))
      .mockResolvedValueOnce(Response.json({}));
    vi.stubGlobal('fetch', fetch);
    const drive = await connectProfileDrive(user);
    await drive.save('backup', new Blob(['backup']));
    expect(fetch.mock.calls[1][0]).toContain('/existing?uploadType=media');
    expect(fetch.mock.calls[1][1].method).toBe('PATCH');
    session.currentUser.uid = 'different';
    await expect(drive.read('backup')).rejects.toThrow('A conta mudou');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
