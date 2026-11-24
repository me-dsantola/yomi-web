import { describe, expect, it } from 'vitest';
import { BotEngine } from '@/components/brand/bloub/bot/engine';
import { CyclePlayer } from '@/components/brand/bloub/bot/cycles';
import { SHAPES } from '@/components/brand/bloub/bot/skins';
import { STATES } from '@/components/brand/bloub/bot/states';

function vertices(path:string){return [...path.matchAll(/([MC])([^MCZ]+)/g)].flatMap(([,op,s])=>{const n=s.trim().split(/[ ,]+/).map(Number);return op==='M'?n:n.slice(-2);});}
function delta(a:string,b:string){const x=vertices(a),y=vertices(b);return Math.max(...x.map((n,i)=>Math.abs(n-y[i])));}

describe('user shape survives every Kuro action',()=>{
 for(const shape of SHAPES)it(`${shape.id}: normal body states retain its radial geometry`,()=>{
  for(const state of STATES.filter(state=>state.baseBody)){const engine=new BotEngine(100,state.id,shape.radii);
   for(const time of [0,.3,1.2,2.49,2.51,3.6,6]){
    const frame=engine.sample(time);
    expect(frame.silhouette.radii).toEqual(shape.radii);
    expect(frame.silhouette.sx).toBeGreaterThanOrEqual(.92);
    expect(frame.silhouette.sy).toBeLessThanOrEqual(1.09);
    expect(frame.bodyPath).not.toMatch(/NaN|Infinity/);
   }
  }
 });
 it('has no cutoff at any pair of state boundaries or transition ends',()=>{
  for(const shape of SHAPES)for(const from of STATES)for(const to of STATES){
   const engine=new BotEngine(100,from.id,shape.radii);
   const before=engine.sample(3).bodyPath;engine.setState(to.id,3);
   expect(delta(before,engine.sample(3).bodyPath)).toBeLessThan(.02);
   const end=3+to.morph;
   expect(delta(engine.sample(end-1e-6).bodyPath,engine.sample(end+1e-6).bodyPath)).toBeLessThan(.05);
  }
 });
 it('retargets an unfinished shape morph from its displayed vertices',()=>{
  const engine=new BotEngine(100,'orbit',SHAPES[0].radii);
  engine.setShape(SHAPES[7].radii,1);
  const before=engine.sample(1.12).bodyPath;
  engine.setShape(SHAPES[4].radii,1.12);
  expect(delta(before,engine.sample(1.12).bodyPath)).toBeLessThan(.02);
  expect(engine.sample(1.7).silhouette.radii).toEqual(SHAPES[4].radii);
 });
 it('does not flip rotation branches inside spinning transitions',()=>{
  for(const [from,to] of [['idle','orbit'],['orbit','idle'],['orbit','play'],['play','orbit']] as const){
   const engine=new BotEngine(100,from,SHAPES[7].radii);
   engine.setState(to,2.8);
   let before=engine.sample(2.8).bodyPath;
   for(let i=1;i<=700;i++){
    const after=engine.sample(2.8+i*.001).bodyPath;
    expect(delta(before,after)).toBeLessThan(3);
    before=after;
   }
  }
 });
 it('preserves geometry across cycle wraps and repeated action blocks',()=>{
  const shape=SHAPES[7].radii;
  const engine=new BotEngine(100,'idle',shape);
  const player=new CyclePlayer(engine,[{state:'orbit',duration:2.8},{state:'orbit',duration:2.8},{state:'idle',duration:1}]);
  for(const t of [0,2.799999,2.8,3.4,5.599999,5.6,6.599999,6.6,7.2,13.2]){
   expect(player.sample(t).silhouette.radii).toEqual(shape);
  }
 });
});
