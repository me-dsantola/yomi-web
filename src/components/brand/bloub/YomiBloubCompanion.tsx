'use client';
import { useEffect, useRef, useState } from 'react';
import { YomiBloub, type MascotContext } from './yomi-renderer';
import type { StateId } from './bot/states';
import { EMPTY_EQUIPMENT, type Equipment } from './cosmetics';
import { KURO_WARDROBE_ENABLED } from '@/lib/kuro/features';
import { useCosmetics } from './useCosmetics';

export interface YomiBloubCompanionProps {
 state?:StateId;
 expression?:string;
 shape?:string;
 palette?:string;
 paused?:boolean;
 loading?:boolean;
 follow?:boolean;
 size?:number;
 context?:MascotContext;
 hue?:number;
 label?:string;
 equipment?:Equipment;
}
/** Keep the imperative SVG renderer outside server-rendered markup. */
export function YomiBloubCompanion(props: YomiBloubCompanionProps) {
 const [mounted, setMounted] = useState(false);
 useEffect(() => { setMounted(true); }, []);
 if (!mounted) {
  const size = props.size ?? 160;
  return <svg width={size} height={size} viewBox="0 0 80 80" role="img" aria-label={props.label || 'Kuro'}>
    <path fill="#9993dd" d="M10 46C9 27 22 13 39 12c19-1 32 15 32 33 0 14-11 23-30 23-19 0-30-7-31-22Z"/>
    <g fill="#151526"><ellipse cx="31" cy="38" rx="3" ry="5"/><ellipse cx="49" cy="38" rx="3" ry="5"/></g>
  </svg>;
 }
 return <MountedYomiBloubCompanion {...props} />;
}
/** Experimental React adapter. Does not replace any existing profile data. */
function MountedYomiBloubCompanion({state='idle',expression='attentif',shape='cercle',palette='espacial',paused=false,loading=false,follow=true,size=160,context='manual',hue,label='Kuro, seu companheiro de leitura',equipment}:YomiBloubCompanionProps){
 const wardrobe=useCosmetics();
 const host=useRef<HTMLDivElement>(null);
 const renderer=useRef<YomiBloub|null>(null);
 useEffect(()=>{if(!host.current)return;const instance=new YomiBloub(host.current,{shape,expression});renderer.current=instance;return()=>{instance.destroy();renderer.current=null;};},[]);
 useEffect(()=>renderer.current?.setExpression(expression),[expression]);
 useEffect(()=>renderer.current?.setShape(shape),[shape]);
 useEffect(()=>renderer.current?.setPalette(palette),[palette]);
 useEffect(()=>renderer.current?.setPaused(paused),[paused]);
 useEffect(()=>renderer.current?.setFollow(follow),[follow]);
 useEffect(()=>renderer.current?.setContext(context),[context]);
 useEffect(()=>renderer.current?.setLoading(loading),[loading]);
 useEffect(()=>{if(context==='manual'&&!loading)renderer.current?.setState(state);},[state,context,loading]);
 useEffect(()=>{if(hue===undefined||hue<0)return;const color=(s:number,l:number)=>{const a=s*Math.min(l,1-l);const f=(n:number)=>{const k=(n+hue/30)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1)))).toString(16).padStart(2,'0');};return '#'+f(0)+f(8)+f(4);};renderer.current?.setAppearance({primary:color(.65,.65),accent:color(.75,.82),deep:color(.5,.32),paper:'#101529'});},[hue]);
 useEffect(()=>{renderer.current?.svg.setAttribute('aria-label',label);},[label]);
 useEffect(()=>renderer.current?.setEquipment(equipment??(KURO_WARDROBE_ENABLED?wardrobe.equipment:EMPTY_EQUIPMENT)),[equipment,wardrobe.equipment]);
 return <div ref={host} style={{width:size,height:size}} />;
}
