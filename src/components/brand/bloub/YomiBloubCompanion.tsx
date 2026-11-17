'use client';
import { useEffect, useRef } from 'react';
import { YomiBloub, type MascotContext } from './yomi-renderer';
import type { StateId } from './bot/states';

export interface YomiBloubCompanionProps {
 state?:StateId;
 expression?:string;
 shape?:string;
 palette?:string;
 paused?:boolean;
 follow?:boolean;
 size?:number;
 context?:MascotContext;
 hue?:number;
 label?:string;
}
/** Experimental React adapter. Does not replace any existing profile data. */
export function YomiBloubCompanion({state='idle',expression='attentif',shape='goutte',palette='espacial',paused=false,follow=true,size=160,context='manual',hue,label='Kuro, seu companheiro de leitura'}:YomiBloubCompanionProps){
 const host=useRef<HTMLDivElement>(null);
 const renderer=useRef<YomiBloub|null>(null);
 useEffect(()=>{if(!host.current)return;const instance=new YomiBloub(host.current,{shape,expression});renderer.current=instance;return()=>{instance.destroy();renderer.current=null;};},[]);
 useEffect(()=>renderer.current?.setExpression(expression),[expression]);
 useEffect(()=>renderer.current?.setShape(shape),[shape]);
 useEffect(()=>renderer.current?.setPalette(palette),[palette]);
 useEffect(()=>renderer.current?.setPaused(paused),[paused]);
 useEffect(()=>renderer.current?.setFollow(follow),[follow]);
 useEffect(()=>renderer.current?.setContext(context),[context]);
 useEffect(()=>{if(context==='manual')renderer.current?.setState(state);},[state,context]);
 useEffect(()=>{if(hue===undefined||hue<0)return;const color=(s:number,l:number)=>{const a=s*Math.min(l,1-l);const f=(n:number)=>{const k=(n+hue/30)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1)))).toString(16).padStart(2,'0');};return '#'+f(0)+f(8)+f(4);};renderer.current?.setAppearance({primary:color(.65,.65),accent:color(.75,.82),deep:color(.5,.32),paper:'#101529'});},[hue]);
 useEffect(()=>{renderer.current?.svg.setAttribute('aria-label',label);},[label]);
 return <div ref={host} style={{width:size,height:size}} />;
}
