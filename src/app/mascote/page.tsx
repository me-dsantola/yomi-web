'use client';

import { useState } from 'react';
import { BlobatarCompanion } from '@/components/brand/BlobatarCompanion';
import type { MascotContext } from '@/components/brand/bloub/yomi-renderer';

const places:{id:MascotContext;title:string;message:string}[]=[
  {id:'welcome',title:'Boas-vindas',message:'Que bom ter você por aqui. Qual história vamos descobrir hoje?'},
  {id:'profile',title:'Seu perfil',message:'Seu companheiro, com as suas cores e o seu jeito.'},
  {id:'library',title:'Na biblioteca',message:'Vamos encontrar a próxima história favorita?'},
  {id:'reader',title:'Durante a leitura',message:'Uma companhia discreta, disponível nos controles e fora das páginas.'},
  {id:'complete',title:'Capítulo concluído',message:'Mais uma história compartilhada. Vamos para o próximo?'},
];
export default function MascotPage(){
 const [place,setPlace]=useState<MascotContext>('profile');
 const [hue,setHue]=useState<number|undefined>();
 const current=places.find(p=>p.id===place)!;
 return <main className="mx-auto max-w-4xl px-5 pb-12 pt-32 text-white">
   <p className="text-xs uppercase tracking-[.22em] text-violet-300">Seu companheiro de histórias</p>
   <h1 className="mt-3 text-4xl font-bold">Kuro pelo Yomi.</h1>
   <p className="mt-4 max-w-xl text-sm leading-7 text-white/60">Um olhar curioso na biblioteca, uma comemoração ao terminar o capítulo e uma presença tranquila para acompanhar você. Mova o mouse pela página: o Kuro acompanha você com o olhar.</p>
   <section className="mt-8 rounded-3xl border border-white/10 bg-[#101529] p-8 text-center">
     <div className="flex justify-center"><BlobatarCompanion key={place} context={place} hue={hue} size={260} expression={place==='library'?'unsure':'happy'} background={false} /></div>
     <h2 className="mt-3 text-xl font-semibold">{current.title}</h2><p className="mt-2 text-sm text-white/65">{current.message}</p>
   </section>
   <div className="mt-6 flex flex-wrap gap-2" aria-label="Experimente os contextos">{places.map(p=><button key={p.id} type="button" aria-pressed={place===p.id} onClick={()=>setPlace(p.id)} className={`rounded-full border px-4 py-2 text-xs ${place===p.id?'border-violet-400 bg-violet-400/20':'border-white/15'}`}>{p.title}</button>)}</div>
   <div className="mt-5 flex flex-wrap gap-2" aria-label="Cores do Kuro">{[{name:'Espacial',hue:undefined},{name:'Ciano',hue:190},{name:'Violeta',hue:270},{name:'Rosa',hue:325},{name:'Esmeralda',hue:155},{name:'Âmbar',hue:38},{name:'Coral',hue:12},{name:'Lunar',hue:220}].map(p=><button key={p.name} type="button" onClick={()=>setHue(p.hue)} className="rounded-full border border-white/15 px-4 py-2 text-xs">{p.name}</button>)}</div>
 </main>;
}
