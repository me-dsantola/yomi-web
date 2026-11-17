import { BotEngine, type BotFrame } from './bot/engine';
import { SHAPE_BY_ID, mixHex } from './bot/skins';
import { EXPRESSION_BY_ID } from './bot/expressions';
import { STATE_BY_ID, type StateId } from './bot/states';
import { DEMI_VIEWBOX, RAYON } from './bot/repere';

const NS='http://www.w3.org/2000/svg';
let serial=0;
export type Appearance={primary:string;accent:string;deep:string;paper:string};
export type MascotContext='manual'|'welcome'|'profile'|'library'|'reader'|'complete'|'empty';
export const PALETTES:Record<string,Appearance>={
 espacial:{primary:'#8c70ff',accent:'#52e3f5',deep:'#383a98',paper:'#101529'},
 ciano:{primary:'#32bfdc',accent:'#a2f8ef',deep:'#176286',paper:'#101529'},
 violeta:{primary:'#ad77f2',accent:'#e1c2ff',deep:'#59368e',paper:'#101529'},
 rosa:{primary:'#ee8bc0',accent:'#ffcee6',deep:'#9d386e',paper:'#101529'},
 esmeralda:{primary:'#39c99c',accent:'#b2f4cc',deep:'#17665d',paper:'#101529'},
 ambar:{primary:'#e6a94d',accent:'#ffe7a4',deep:'#8c542c',paper:'#101529'},
 coral:{primary:'#e7807e',accent:'#ffcfb9',deep:'#994365',paper:'#101529'},
 lunar:{primary:'#a4b4d7',accent:'#e5f6ff',deep:'#536486',paper:'#101529'},
 original:{primary:'#0a0a0c',accent:'#0a0a0c',deep:'#0a0a0c',paper:'#f4f2ec'}
};
function node(tag:string,attrs:Record<string,string|number>={}){const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n;}
function attrs(el:Element,a:Record<string,string|number>){for(const [k,v] of Object.entries(a))el.setAttribute(k,String(v));}
function pool(parent:Element,items:Record<string,string|number>[],tag='path'){
 while(parent.children.length>items.length)parent.lastElementChild!.remove();
 items.forEach((a,i)=>{let n=parent.children[i];if(!n){n=node(tag);parent.append(n);}attrs(n,a);});
}

/** Shared renderer: the demo and React adapter use the same instance API. */
export class YomiBloub {
 svg:SVGSVGElement;
 engine:BotEngine;
 clock=0;
 state:StateId='idle';
 appearance=PALETTES.espacial;
 shape='goutte';
 expression='attentif';
 paused=false;
 follow=true;
 disposed=false;
 frames=0;
 private raf=0;
 private last=0;
 private colorFrom=this.appearance;
 private colorAt=-1;
 private gaze={yaw:0,pitch:0};
 private settleAt=0;
 private context:MascotContext='manual';
 private returnAt=Infinity;
 private nextGesture=Infinity;
 private gestureIndex=0;
 private visible=true;
 private pointer:{x:number;y:number}|null=null;
 private media=matchMedia('(prefers-reduced-motion: reduce)');
 private observer:IntersectionObserver;
 private uid='yomi-bloub-'+(++serial);
 private defs:Element;
 private arcDefs:Element;
 private mask:Element;
 private bodyMask:Element;
 private eyeMasks:Element;
 private notchMask:Element;
 private backdrop:Element;
 private body:Element;
 private back:Element;
 private front:Element;
 private dotsBack:Element;
 private dotsFront:Element;
 private notify:Element;
 private screenListener=()=>{this.last=0;this.sync();};
 private move=(e:PointerEvent)=>{if(e.pointerType!=='touch')this.pointer={x:e.clientX,y:e.clientY};};
 private leave=()=>{this.pointer=null;this.engine.setLook(null,this.clock);};
 constructor(private host:HTMLElement){
  this.engine=new BotEngine(RAYON,'idle',SHAPE_BY_ID.get(this.shape)!.radii,EXPRESSION_BY_ID.get(this.expression)!);
  this.svg=node('svg',{viewBox:`${-DEMI_VIEWBOX} ${-DEMI_VIEWBOX} ${2*DEMI_VIEWBOX} ${2*DEMI_VIEWBOX}`,role:'img','aria-label':'Mascote experimental Yomi, baseado no motor Bloub'}) as SVGSVGElement;
  this.svg.style.cssText='display:block;width:100%;height:100%;overflow:visible';
  this.defs=node('defs');this.arcDefs=node('g');
  const gradient=node('linearGradient',{id:this.uid+'-body',x1:'0%',y1:'0%',x2:'85%',y2:'100%'});
  [0,.5,1].forEach(t=>gradient.append(node('stop',{offset:t})));
  this.mask=node('mask',{id:this.uid+'-mask',maskUnits:'userSpaceOnUse',x:-DEMI_VIEWBOX,y:-DEMI_VIEWBOX,width:2*DEMI_VIEWBOX,height:2*DEMI_VIEWBOX});
  this.bodyMask=node('path',{fill:'white'});this.eyeMasks=node('g',{fill:'black'});this.notchMask=node('circle',{fill:'black'});
  this.mask.append(this.bodyMask,this.eyeMasks,this.notchMask);this.defs.append(gradient,this.mask,this.arcDefs);this.svg.append(this.defs);
  this.back=node('g',{fill:'none','stroke-linecap':'round'});this.front=node('g',{fill:'none','stroke-linecap':'round'});
  this.dotsBack=node('g');this.dotsFront=node('g');
  this.backdrop=node('path');this.body=node('path',{mask:`url(#${this.uid}-mask)`});this.notify=node('circle');
  this.svg.append(this.back,this.dotsBack,this.backdrop,this.body,this.dotsFront,this.notify,this.front);host.append(this.svg);
  this.observer=new IntersectionObserver(entries=>{this.visible=entries[0]?.isIntersecting??false;this.last=0;this.sync();});this.observer.observe(host);
  this.media.addEventListener('change',this.screenListener);document.addEventListener('visibilitychange',this.screenListener);
  host.addEventListener('pointermove',this.move);host.addEventListener('pointerleave',this.leave);
  this.paint();this.sync();
 }
 setState(id:string){if(!STATE_BY_ID.has(id as StateId)||this.state===id)return;this.state=id as StateId;this.pointer=null;this.engine.setLook(null,this.clock);this.engine.setState(this.state,this.clock);this.settleAt=this.clock+.72;this.changed();}
 setShape(id:string){const s=SHAPE_BY_ID.get(id);if(!s)return;this.shape=id;this.engine.setShape(s.radii,this.clock);this.changed();}
 setExpression(id:string){const e=EXPRESSION_BY_ID.get(id);if(!e)return;this.expression=id;this.engine.setExpression(e,this.clock);this.changed();}
 setPalette(id:string){if(PALETTES[id])this.setAppearance(PALETTES[id]);}
 setAppearance(p:Appearance){this.colorFrom=this.colors();this.appearance={...p};this.colorAt=this.clock;this.changed();}
 private colors():Appearance{const t=Math.min(1,Math.max(0,(this.clock-this.colorAt)/.65)),k=t*t*(3-2*t);return Object.fromEntries(Object.keys(this.appearance).map(key=>[key,mixHex(this.colorFrom[key as keyof Appearance],this.appearance[key as keyof Appearance],k)])) as Appearance;}
 setPaused(value:boolean){this.paused=value;this.last=0;this.sync();}
 setFollow(value:boolean){this.follow=value;if(!value)this.leave();}
 setContext(context:MascotContext){
  this.context=context;this.gestureIndex=0;this.nextGesture=this.clock+24;
  const opening:Record<MascotContext,StateId>={manual:'idle',welcome:'wink',profile:'orbit',library:'thinking',reader:'idle',complete:'burst',empty:'wide'};
  this.setState(opening[context]);this.returnAt=context==='reader'||context==='manual'?Infinity:this.clock+(context==='complete'?3.6:2.8);
 }
 react(){if(this.context==='reader')return;this.setState('wink');this.returnAt=this.clock+2;this.nextGesture=this.clock+28;}
 private changed(){if(this.paused||this.media.matches)this.clock+=1;this.paint();}
 private runnable(){return !this.disposed&&!this.paused&&!this.media.matches&&this.visible&&!document.hidden;}
 private sync(){if(this.runnable()){if(!this.raf)this.raf=requestAnimationFrame(this.tick);}else{cancelAnimationFrame(this.raf);this.raf=0;this.last=0;}}
 private tick=(ms:number)=>{
  this.raf=0;if(!this.runnable())return;
  const dt=this.last?Math.min((ms-this.last)/1000,.064):0;this.clock+=dt*.9;this.last=ms;
  if(this.clock>=this.returnAt){this.returnAt=Infinity;this.setState('idle');}
  if(this.context!=='manual'&&this.context!=='reader'&&this.clock>=this.nextGesture){const gestures:StateId[]=['wink','thinking','wide'];this.setState(gestures[this.gestureIndex++%gestures.length]!);this.returnAt=this.clock+2.3;this.nextGesture=this.clock+28+(this.gestureIndex%3)*7;}
  if(this.follow&&this.pointer&&this.clock>=this.settleAt&&STATE_BY_ID.get(this.state)?.baseFace){
   const b=this.svg.getBoundingClientRect();if(b.width&&b.height){const amount=1-Math.exp(-dt/.12);this.gaze.yaw+=(Math.max(-45,Math.min(45,(this.pointer.x-b.left-b.width/2)/b.width*60))-this.gaze.yaw)*amount;this.gaze.pitch+=(Math.max(-30,Math.min(30,-(this.pointer.y-b.top-b.height/2)/b.height*45))-this.gaze.pitch)*amount;this.engine.setLook({...this.gaze,mix:1,spin:0,wander:0},this.clock,1/60);}
  }
  this.paint();this.sync();
 };
 paint(at=this.clock){
  if(this.disposed)return;
  const f=this.engine.sample(at),p=this.colors();this.frames++;
  const stops=this.defs.firstElementChild!.children;
  [p.accent,p.primary,p.deep].forEach((c,i)=>attrs(stops[i]!,{'stop-color':c}));
  attrs(this.bodyMask,{d:f.bodyPath});pool(this.eyeMasks,f.eyes.map(e=>({d:e.d,transform:e.matrix,opacity:e.alpha})));
  attrs(this.notchMask,{cx:f.notch?.x??0,cy:f.notch?.y??0,r:f.notch?.r??0});
  attrs(this.backdrop,{d:f.bodyPath,fill:p.paper,opacity:f.bodyAlpha});attrs(this.body,{d:f.bodyPath,fill:`url(#${this.uid}-body)`,opacity:f.bodyAlpha});
  while(this.arcDefs.children.length>f.arcs.length)this.arcDefs.lastElementChild!.remove();
  f.arcs.forEach((a,i)=>{
   let g=this.arcDefs.children[i];if(!g){g=node('linearGradient',{gradientUnits:'userSpaceOnUse'});this.arcDefs.append(g);}
   attrs(g,{id:this.uid+'-arc-'+i,x1:a.grad.x1,y1:a.grad.y1,x2:a.grad.x2,y2:a.grad.y2});
   while(g.children.length>a.grad.stops.length)g.lastElementChild!.remove();
   a.grad.stops.forEach((_,j)=>{let s=g.children[j];if(!s){s=node('stop');g.append(s);}attrs(s,{offset:j/(a.grad.stops.length-1),'stop-color':mixHex(p.accent,p.primary,j/(a.grad.stops.length-1))});});
  });
  const arcs=(front:boolean)=>f.arcs.map((a,i)=>({d:front?a.front:a.back,stroke:`url(#${this.uid}-arc-${i})`,'stroke-width':a.width,opacity:a.opacity}));pool(this.back,arcs(false));pool(this.front,arcs(true));
  const drawDots=(parent:Element,shown:boolean)=>{
   const dots=shown?f.dots:[];
   while(parent.children.length>dots.length)parent.lastElementChild!.remove();
   dots.forEach((d,i)=>{const tag=d.d?'path':'circle';let n=parent.children[i];if(n?.tagName!==tag){const fresh=node(tag);if(n)n.replaceWith(fresh);else parent.append(fresh);n=fresh;}
    const a={fill:d.color??(d.depth===undefined?p.primary:mixHex(p.paper,p.primary,d.depth)),opacity:d.opacity};attrs(n,d.d?{...a,d:d.d,transform:`translate(${d.x} ${d.y}) rotate(${d.rot??0}) scale(${RAYON})`}:{...a,cx:d.x,cy:d.y,r:d.r});
   });
  };drawDots(this.dotsBack,f.dotsBehind);drawDots(this.dotsFront,!f.dotsBehind);
  attrs(this.notify,{cx:f.notif?.x??0,cy:f.notif?.y??0,r:f.notif?.r??0,fill:p.accent});
 }
 destroy(){if(this.disposed)return;this.disposed=true;cancelAnimationFrame(this.raf);this.observer.disconnect();this.media.removeEventListener('change',this.screenListener);document.removeEventListener('visibilitychange',this.screenListener);this.host.removeEventListener('pointermove',this.move);this.host.removeEventListener('pointerleave',this.leave);this.svg.remove();}
}
