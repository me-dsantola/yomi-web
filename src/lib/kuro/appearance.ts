function hexToHue(hex?: string): number | undefined {
  if (!hex || !hex.startsWith('#')) return undefined;
  const clean = hex.slice(1);
  if (clean.length !== 6) return undefined;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return undefined;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return Math.round((h * 60 + 360) % 360);
}

export function profileFrame(value?: string) {
  return value === 'none' ? false : value === 'square' || value === 'squircle' ? value : 'circle';
}

export function resolveMascotHue(hue?: number | null, accentColor?: string, seed?: string) {
  if (hue == null && seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 360;
    return hash;
  }
  return typeof hue === 'number' && Number.isFinite(hue) && hue >= 0
    ? hue % 360
    : hexToHue(accentColor);
}

export const BANNERS = [
  {id:'preset:horizonte_distante', title:'Horizonte distante', src:'/brand/banners/horizonte_distante.webp'},
  {id:'preset:lua_vermelha', title:'Lua vermelha', src:'/brand/banners/lua_vermelha.webp'},
  {id:'preset:portal_da_noite', title:'Portal da noite', src:'/brand/banners/portal_da_noite.webp'},
  {id:'preset:torii_crimson', title:'Torii Carmesim', src:'/brand/banners/torii_crimson.png'},
  {id:'preset:moonlit_library', title:'Biblioteca da Lua', src:'/brand/banners/moonlit_library.png'},
  {id:'preset:seinen_eyes', title:'Olhar Seinen', src:'/brand/banners/seinen_eyes.png'},
  {id:'preset:sakura_night', title:'Sakura Imperial', src:'/brand/banners/sakura_night.png'},
  {id:'preset:cyber_shogun', title:'Neo-Tokyo Violeta', src:'/brand/banners/cyber_shogun.png'},
  {id:'preset:azure_horizon', title:'Horizonte Azul', src:'/brand/banners/azure_horizon.png'},
];
export function portableImage(path?:string) {
  if (!path) return;
  try {
    const url = new URL(path);
    if(url.protocol === 'https:' && !url.username && !url.password) return url.href;
  } catch { /* App-local files use the synchronized thumbnail. */ }
}
export function profileBanner(path?:string) {
  return BANNERS.find(b=>b.id===path)?.src || portableImage(path);
}
export const MASCOT_HUES = [0,12,24,36,48,60,75,90,105,125,145,165,180,195,210,225,240,255,270,285,300,315,330,345,354];

export function mascotHex(hue:number, saturation=.65, lightness=.65) {
  const channel = (n:number) => {
    const k=(n+hue/30)%12;
    const value=lightness-saturation*Math.min(lightness,1-lightness)*Math.max(-1,Math.min(k-3,9-k,1));
    return Math.round(255*value).toString(16).padStart(2,'0');
  };
  return '#'+channel(0)+channel(8)+channel(4);
}
