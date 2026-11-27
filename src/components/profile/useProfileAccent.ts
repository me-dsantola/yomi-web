'use client';
import {useEffect, useState} from 'react';
import {argbIntToHex, type YomiProfile} from '@/lib/backup/kuroCodec';
import {resolveMascotHue, mascotHex} from '@/lib/kuro/appearance';

async function dominantColor(source: string, minimumSaturation: number) {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = source;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.drawImage(image, 0, 0, 32, 32);
  const {data} = ctx.getImageData(0, 0, 32, 32);
  const bins = Array.from({length:24}, () => ({weight:0,r:0,g:0,b:0}));
  for (let i=0; i<data.length; i+=4) {
    const [r,g,b,a] = data.subarray(i,i+4);
    const max = Math.max(r,g,b), delta = max-Math.min(r,g,b);
    const saturation = delta/max, value=max/255;
    if (a<120 || value<.14 || value>.97 || saturation<minimumSaturation) continue;
    const sector = max===r ? (g-b)/delta : max===g ? (b-r)/delta+2 : (r-g)/delta+4;
    const bin = bins[Math.floor(((sector+6)%6)*4)];
    const weight = saturation**1.4*(.4+.6*Math.sin(value*Math.PI));
    bin.weight+=weight; bin.r+=r*weight; bin.g+=g*weight; bin.b+=b*weight;
  }
  const best = bins.reduce((a,b)=>a.weight>b.weight?a:b);
  if(best.weight>.05) return '#'+[best.r,best.g,best.b].map(c=>Math.round(c/best.weight).toString(16).padStart(2,'0')).join('');
}

export function useProfileAccent(profile?: YomiProfile, avatar?: string | null, banner?: string | null) {
  const [sample,setSample]=useState<{key:string;color:string}>();
  const photo = profile?.useBlobatarAsAvatar ? undefined : avatar;
  const manual = profile?.customAccentColor;
  const key = JSON.stringify([photo,banner]);
  useEffect(()=>{
    if(manual!=null) return;
    let active=true;
    (async()=>{
      for(const [src,min] of [[photo,.18],[banner,.08],[photo,.08]] as const) {
        if(!src) continue;
        const color=await dominantColor(src,min).catch(()=>undefined);
        if(color) {if(active)setSample({key,color}); break;}
      }
    })();
    return ()=>{active=false;};
  },[photo,banner,manual,key]);
  if(manual!=null) return argbIntToHex(manual);
  if(sample?.key===key) return sample.color;
  const hue=resolveMascotHue(profile?.blobatarHue,undefined,profile?.blobatarSeed || profile?.name) ?? 347;
  return mascotHex(hue);
}
