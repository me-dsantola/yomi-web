import { describe, expect, it } from 'vitest';
import { BotEngine } from '@/components/brand/bloub/bot/engine';
import { SHAPE_BY_ID } from '@/components/brand/bloub/bot/skins';
import { EXPRESSION_BY_ID } from '@/components/brand/bloub/bot/expressions';

describe('Kuro transitions',()=>{
 it('keeps the visible outline continuous when an action is interrupted',()=>{
  const engine=new BotEngine(100,'idle',SHAPE_BY_ID.get('goutte')!.radii,EXPRESSION_BY_ID.get('attentif')!);
  engine.setState('orbit',1);
  const before=engine.sample(1.12).bodyPath;
  engine.setState('sleep',1.12);
  const after=engine.sample(1.12).bodyPath;
  expect(after).toBe(before);
 });
 it('can reread a transition without advancing or corrupting its pose',()=>{
  const engine=new BotEngine();engine.setState('orbit',1);
  const first=structuredClone(engine.sample(1.2));
  engine.sample(4);expect(engine.sample(1.2)).toEqual(first);
 });
 it('rejects invalid gaze input without poisoning subsequent motion',()=>{
  const engine=new BotEngine();
  engine.setLook({yaw:NaN,pitch:0,mix:1,wander:0,spin:0},1);
  expect(JSON.stringify(engine.sample(1.2))).not.toMatch(/NaN|Infinity/);
  expect(engine.sample(1.2).eyes.every(e=>!e.matrix.includes('NaN'))).toBe(true);
 });
});
