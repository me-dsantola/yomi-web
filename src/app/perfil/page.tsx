'use client';
import { useEffect, useState } from 'react';
import { BlobatarCompanion } from '@/components/brand/BlobatarCompanion';

export default function SharedProfile() {
  const [profile, setProfile] = useState<URLSearchParams | null>(null);
  useEffect(() => {
    const read = () => setProfile(new URLSearchParams(location.hash.slice(1)));
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  if (!profile) return null;
  const accent = profile.get('cor') || '';
  return <article className="mx-auto mt-36 max-w-md rounded-3xl border border-white/10 p-8 text-center">
    <div className="flex justify-center"><BlobatarCompanion context="profile" size={96} accentColor={/^#[a-f0-9]{6}$/i.test(accent) ? accent : undefined}/></div>
    <h1 className="mt-4 break-words text-3xl font-bold">{profile.get('nome')?.slice(0,80) || 'Leitor Yomi'}</h1>
    <p className="mt-3 whitespace-pre-line break-words text-white/70">{profile.get('bio')?.slice(0,240)}</p>
  </article>;
}
