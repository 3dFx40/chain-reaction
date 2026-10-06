import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const answers=JSON.parse(fs.readFileSync(new URL('./solutions.json',import.meta.url)));
fs.mkdirSync('output',{recursive:true});
const browser=await chromium.launch({headless:true}),errors=[],captures=[];
const parts=s=>[...s.rails,...(s.spring?[s.spring]:[]),...s.bumpers,...s.portals,...(s.switch?[s.switch]:[])];
try{
 for(const mobile of (process.argv.includes('--mouse')?[false]:[false,true])){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1050},isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const session=mobile?await context.newCDPSession(page):null;
  const state=async()=>JSON.parse(await page.evaluate(()=>window.render_game_to_text()));
  await page.goto('http://localhost:5173');await page.waitForFunction(()=>window.render_game_to_text);
  async function drag(from,to){
   await page.locator('#game').scrollIntoViewIfNeeded();const box=await page.locator('#game').boundingBox();
   const p=v=>({x:box.x+v.x/700*box.width,y:box.y+v.y/630*box.height}),a=p(from),b=p(to);
   if(mobile){await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});for(let k=1;k<=4;k++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(b.x-a.x)*k/4,y:a.y+(b.y-a.y)*k/4}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   else{await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:4});await page.mouse.up();}
  }
  for(let index=0;index<60;index++){
   await page.click('#open-levels');await page.locator('#chapter-map button').nth(index).click();
   assert.equal((await state()).level,index+1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   if(!mobile)captures.push({level:index+1,url:'data:image/png;base64,'+(await page.locator('#game').screenshot()).toString('base64')});
   const initial=await state();
   // Try every visible fixed device; none may silently move or rotate.
   for(const item of parts(initial).filter(p=>p.fixed)){
    await drag(item,{x:item.x+14,y:item.y+14});
    assert.deepEqual(parts(await state()).find(p=>p.id===item.id),item,`${mobile?'touch':'mouse'} fixed part ${index+1}/${item.id}`);
    assert.equal((await state()).selected,parts(initial).findIndex(p=>p.id===item.id),`correct fixed selection ${index+1}/${item.id}`);
   }
   for(const [id,target] of Object.entries(answers[index].config)){
    let item=parts(await state()).find(p=>p.id===id);if(item.fixed)continue;
    if(item.edit.move!=='none')await drag(item,target);
    item=parts(await state()).find(p=>p.id===id);
    if(item.edit.rotate){const hx=item.len?item.len/2+35:57,hy=item.len?4:0,handle=a=>({x:item.x+Math.cos(a)*hx-Math.sin(a)*hy,y:item.y+Math.sin(a)*hx+Math.cos(a)*hy});await drag(handle(item.a),handle(target.a));}
    const actual=parts(await state()).find(p=>p.id===id);
    assert.ok(Math.abs(actual.x-target.x)<.05&&Math.abs(actual.y-target.y)<.05&&Math.abs(actual.a-target.a)<.005,`${mobile?'touch':'mouse'} legal setup ${index+1}/${id}: ${JSON.stringify({actual,target,selected:(await state()).selected})}`);
   }
   const arrangement=parts(await state());
   await page.click('#release');await page.evaluate(()=>window.advanceTime(9000));
   const won=await state();assert.equal(won.mode,'won',`${mobile?'touch':'mouse'} win ${index+1}: ${won.failure}`);assert.equal(won.routeIndex,won.route.length);
   await page.click('#retry');const retry=await state();assert.equal(retry.mode,'edit');assert.equal(retry.attempts,2);assert.equal(retry.routeIndex,0);assert.equal(retry.switchOn,false);assert.deepEqual(parts(retry),arrangement);
   if(mobile&&[6,9,20,35,40,54,59].includes(index))await page.screenshot({path:`output/audit-mobile-${index+1}.png`,fullPage:true});
   console.log(`${mobile?'TOUCH':'MOUSE'} ${index+1}/60: all parts, win, retry PASS`);
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);
 const preview=await browser.newPage({viewport:{width:1400,height:1700}});
 for(let chapter=0;chapter<6;chapter++){
  await preview.setContent('<style>body{margin:12px;background:#f8f5ed;font:18px Arial}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}img{width:100%}</style><div class="grid">'+captures.slice(chapter*10,chapter*10+10).map(p=>`<div>Stage ${p.level}<img src="${p.url}"></div>`).join('')+'</div>');
  await preview.screenshot({path:`output/audit-chapter-${chapter+1}.png`,fullPage:true});
 }
 fs.writeFileSync(process.argv.includes('--mouse')?'output/audit-mouse-result.json':'output/audit-result.json',JSON.stringify({errors,desktopWins:60,touchWins:process.argv.includes('--mouse')?0:60,retryChecks:process.argv.includes('--mouse')?60:120,allFixedDevicesChecked:true}));
 console.log('PASS: all 60 stages solved through real '+(process.argv.includes('--mouse')?'mouse UI':'mouse and touch UI')+', all fixed devices and retries checked, no console errors.');
}finally{await browser.close();}
