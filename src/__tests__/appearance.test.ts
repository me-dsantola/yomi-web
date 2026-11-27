import {describe,expect,it} from 'vitest';
import {BANNERS,MASCOT_HUES,mascotHex,profileFrame,resolveMascotHue} from '../lib/kuro/appearance';
import {existsSync} from 'node:fs';

describe('aparência compartilhada do Kuro',()=>{
  it('preserva o vermelho, a escolha manual e os dois modos automáticos',()=>{
    expect(resolveMascotHue(0,'#00ff00','Kuro')).toBe(0);
    expect(resolveMascotHue(360,'#00ff00')).toBe(0);
    expect(resolveMascotHue(-1,'#00ff00','Kuro')).toBe(120);
    expect(resolveMascotHue(null,'#00ff00','Kuro')).toBe(327);
    expect(new Set(MASCOT_HUES.map(h=>mascotHex(h))).size).toBe(25);
  });
  it('entrega todos os banners e as quatro molduras',()=>{
    expect(BANNERS).toHaveLength(9);
    expect(BANNERS.every(b=>existsSync('public'+b.src))).toBe(true);
    expect(['circle','squircle','square','none'].map(profileFrame)).toEqual(['circle','squircle','square',false]);
  });
});
