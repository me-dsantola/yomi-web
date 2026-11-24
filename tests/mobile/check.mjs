import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const { chromium, webkit } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
assert.equal(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, 'demo-yomi-kuro');
assert.equal(process.env.NEXT_PUBLIC_YOMI_EMULATORS, '1');
const base = 'http://127.0.0.1:3100';
const workId = '11111111-1111-4111-8111-111111111111';
const chapterId = '22222222-2222-4222-8222-222222222222';
const image = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200"><rect width="800" height="1200" fill="#171721"/><text x="70" y="150" fill="white" font-size="36">Yomi test page</text></svg>';
const chapter = {id:chapterId,attributes:{chapter:'1',title:'Test chapter',pages:5,translatedLanguage:'pt-br'},relationships:[{type:'manga',id:workId,attributes:{title:{en:'Yomi Test Work'}}},{type:'scanlation_group',attributes:{name:'Test group'}}]};
const work = {id:workId,attributes:{title:{en:'Yomi Test Work'},description:{en:'Synthetic test work'},status:'ongoing',contentRating:'safe',tags:[]},relationships:[]};
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', process.env.YOMI_BROWSER_DEV === '1' ? 'dev' : 'start','-p','3100'], {stdio:'inherit'});
await mkdir('test-results/mobile', {recursive:true});
async function waitFor(predicate, message, timeout=30000) {
  const start=Date.now();
  while(Date.now()-start<timeout) {
    if(await predicate().catch(()=>false)) return;
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  throw new Error(message);
}
async function fixture(context) {
  await context.addInitScript(() => {
    localStorage.setItem('yomi-cookie-consent-v1', '{"mode":"essential"}');
  });
  await context.route('**/api/md/**', async route => {
    const url = new URL(route.request().url());
    if(url.pathname.includes('/at-home/')) return route.fulfill({json:{baseUrl:base,chapter:{hash:'test',data:['1.png','2.png','3.png','4.png','5.png'],dataSaver:[]}}});
    if(url.pathname.includes('/chapter/')) return route.fulfill({json:{data:chapter}});
    if(url.pathname.endsWith('/feed')) return route.fulfill({json:{data:url.searchParams.get('translatedLanguage[]')==='pt-br'?[chapter]:[],total:url.searchParams.get('translatedLanguage[]')==='pt-br'?1:0}});
    if(url.pathname=== '/api/md/manga') return route.fulfill({json:{data:[work],total:1}});
    return route.fulfill({json:{data:work}});
  });
  await context.route(url => /\.(png|jpe?g|webp|svg)$/.test(url.pathname) || ['/api/cover','/api/page'].includes(url.pathname), route => route.fulfill({contentType:'image/svg+xml',body:image}));
}
async function noOverflow(page) {
  const sizes=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(sizes.scroll<=sizes.width+1, JSON.stringify(sizes));
}
try {
  await waitFor(async()=> (await fetch(base)).ok,'Production server failed to start',60000);
  for(const [engine,name] of [[chromium,'chromium'],[webkit,'webkit']]) {
    const browser=await engine.launch();
    try {
      for(const [width,height] of [[320,568],[390,844],[844,390],[1280,800]]) {
        const context=await browser.newContext({viewport:{width,height},isMobile:width<900,hasTouch:width<900,reducedMotion:'reduce'});
        await fixture(context);
        const page=await context.newPage();
        const pageErrors=[];page.on('pageerror',error=>pageErrors.push(page.url()+': '+error.message));
        page.on('console', message => { if (message.type() === 'error') console.error(page.url(), message.text()); });
        for(const route of ['/','/explorar','/biblioteca','/conta','/obra/'+workId]) {
          await page.goto(base+route);
          await page.locator('main').waitFor();
          await page.waitForTimeout(300);
          assert.deepEqual(pageErrors,[], 'Page hydration: '+route);
          await noOverflow(page);
          if (route.startsWith('/obra/')) {
            const stars = page.getByRole('region', {name:'Avaliação da comunidade'}).getByRole('button', {name:/Avaliar com/});
            await stars.first().waitFor();
            const boxes = await Promise.all((await stars.all()).map(star=>star.boundingBox()));
            assert.equal(boxes.length,5);
            assert.ok(boxes.every(box=>box && box.width>=44 && box.height>=44 && Math.abs(box.y-boxes[0].y)<1), 'Rating stars must remain together with 44px touch targets');
          }
        }
        await page.goto(base+'/ler/'+chapterId);
        await page.getByRole('button',{name:'Pag. LTR',exact:true}).waitFor();
        await page.getByRole('button',{name:'Pag. LTR',exact:true}).click();
        await waitFor(()=>page.getByAltText('Página 1',{exact:true}).isVisible(),'First paged image missing');
        await noOverflow(page);
        await page.screenshot({path:'test-results/mobile/'+name+'-'+width+'-reader.png'});
        await page.getByRole('button',{name:'Abrir comentários do capítulo',exact:true}).click();
        const dialog=page.getByRole('dialog',{name:'Comentários do capítulo',exact:true});
        await dialog.waitFor();
        await noOverflow(page);
        const bounds=await dialog.boundingBox();assert.ok(bounds && bounds.width<=width+1);
        await page.getByRole('button',{name:'Fechar comentários',exact:true}).click();
        await waitFor(async()=> !(await dialog.isVisible()),'Comments dialog did not close');
        await page.getByRole('button',{name:'Pag. RTL',exact:true}).click();
        await noOverflow(page);
        assert.deepEqual(pageErrors,[]);
        console.log('PASS: '+name+' '+width+'x'+height+' routes, reader modes and comments');
        await context.close();
      }
      const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
      await fixture(context);
      const page=await context.newPage();
      const email=name+'@yomi-test.invalid',password='synthetic-password-123';
      const signup=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=test-key',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});
      assert.equal(signup.ok,true);
      await page.goto(base+'/obra/'+workId);
      const rating=page.getByRole('region',{name:'Avaliação da comunidade'});
      // section with accessible name exposes a region landmark.
      await rating.getByRole('button',{name:'Avaliar com 5 estrelas',exact:true}).click();
      const auth=page.getByRole('dialog',{name:'Entrar no YOMI'});
      await auth.waitFor();
      await auth.locator('input[type="email"]').fill(email);
      await auth.locator('input[type="password"]').fill(password);
      await auth.getByRole('button',{name:'Entrar com E-mail',exact:true}).click();
      await waitFor(async()=> !(await auth.isVisible()),'Authentication did not complete');
      const five=rating.getByRole('button',{name:'Avaliar com 5 estrelas',exact:true});
      await five.waitFor();
      await waitFor(()=>five.isEnabled(),'Rating failed to become ready');
      await five.click();
      await waitFor(()=>rating.getByText('Sua nota: 5 / 5',{exact:true}).isVisible(),'Vote was not saved');
      await rating.getByRole('button',{name:'Avaliar com 4 estrelas',exact:true}).click();
      await waitFor(()=>rating.getByText('Sua nota: 4 / 5',{exact:true}).isVisible(),'Vote edit was not saved');
      await page.reload();
      await waitFor(()=>rating.getByText('Sua nota: 4 / 5',{exact:true}).isVisible(),'Vote was not persisted');
      await page.screenshot({path:'test-results/mobile/'+name+'-work-rating.png'});
      await page.goto(base);
      await page.getByRole('heading',{name:'Em alta no YOMI',exact:true}).waitFor();
      await noOverflow(page);
      await page.screenshot({path:'test-results/mobile/'+name+'-community-ranking.png'});
      console.log('PASS: '+name+' authenticated rating, edit, persistence and community trending');
      await context.close();
    } finally { await browser.close(); }
  }
} finally { server.kill('SIGTERM'); }
