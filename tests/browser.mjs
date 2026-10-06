import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const fixtures=JSON.parse(fs.readFileSync(new URL('./solutions.json',import.meta.url)));
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1050}});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const state=async(p=page)=>JSON.parse(await p.evaluate(()=>window.render_game_to_text()));
const parts=s=>[...s.rails,...(s.spring?[s.spring]:[]),...s.bumpers,...s.portals,...(s.switch?[s.switch]:[])];
async function level(index,p=page){await p.click('#open-levels');await p.locator('#chapter-map button').nth(index).click();assert.equal((await state(p)).level,index+1);}
async function drag(from,to,p=page){await p.locator('#game').scrollIntoViewIfNeeded();const b=await p.locator('#game').boundingBox();await p.mouse.move(b.x+from.x/700*b.width,b.y+from.y/630*b.height);await p.mouse.down();await p.mouse.move(b.x+to.x/700*b.width,b.y+to.y/630*b.height,{steps:5});await p.mouse.up();}
async function solve(index,p=page){
 await level(index,p);
 for(const [id,target] of Object.entries(fixtures[index].config)){
  let item=parts(await state(p)).find(v=>v.id===id);if(item.fixed)continue;
  await drag(item,{x:target.x,y:target.y},p);
  item=parts(await state(p)).find(v=>v.id===id);
  if(item.edit.rotate){const hx=item.len?item.len/2+35:57,hy=item.len?4:0;
   const handle=a=>({x:item.x+Math.cos(a)*hx-Math.sin(a)*hy,y:item.y+Math.sin(a)*hx+Math.cos(a)*hy});
   await drag(handle(item.a),handle(target.a),p);
  }
  const actual=parts(await state(p)).find(v=>v.id===id);assert.ok(Math.abs(actual.x-target.x)<.01&&Math.abs(actual.y-target.y)<.01&&Math.abs(actual.a-target.a)<.01,`legal UI setup ${index+1}/${id}: actual ${JSON.stringify(actual)}, target ${JSON.stringify(target)}, selected ${(await state(p)).selected}`);
 }
 await p.click('#release');await p.evaluate(()=>window.advanceTime(9000));const s=await state(p);assert.equal(s.mode,'won',`stage ${index+1}: ${s.failure}`);assert.equal(s.routeIndex,s.route.length);
}
await page.goto('http://localhost:5173');await page.waitForFunction(()=>window.render_game_to_text);
if(process.argv.includes('--level7')){await solve(6);await page.screenshot({path:'output/stage7-won.png',fullPage:true});await browser.close();process.exit(0);}
await page.screenshot({path:'output/new-desktop.png',fullPage:true});
await page.click('#release');await page.evaluate(()=>window.advanceTime(9000));assert.equal((await state()).mode,'failed');await page.click('#result-action');assert.equal((await state()).attempts,2);
let before=(await state()).rails[0];await drag(before,{x:before.x+10,y:before.y+12});let after=(await state()).rails[0];assert.ok(after.x>before.x);await page.click('#rotate');assert.ok((await state()).rails[0].a>after.a);await page.click('#retry');assert.equal((await state()).rails[0].x,after.x);
await solve(0);await page.click('#result-action');assert.equal((await state()).level,2);await page.reload();assert.equal((await state()).level,2);assert.ok((await state()).completed.includes(0));
await page.click('#help');assert.equal(await page.locator('#help-dialog').evaluate(d=>d.open),true);await page.click('#got-it');
await page.click('#sound');assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'true');await page.click('#sound');assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'false');
await level(0);await page.click('#next-chapter');assert.equal((await state()).level,11);await page.click('#prev-chapter');assert.equal((await state()).level,1);
await level(1);before=(await state()).rails[0];await page.locator('#game').focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('a');assert.equal((await state()).rails[0].y,before.y);assert.equal((await state()).rails[0].a,before.a);await page.keyboard.press('ArrowRight');assert.ok((await state()).rails[0].x>before.x);await page.click('#reset-layout');assert.equal((await state()).rails[0].x,before.x);
await level(9);await page.locator('#game').focus();await page.keyboard.press('Tab');assert.equal((await state()).selected,1);before=(await state()).rails[1];await page.keyboard.press('a');assert.ok((await state()).rails[1].a<before.a);assert.equal(await page.locator('#rotate').isDisabled(),false);
await page.keyboard.press('f');await page.waitForFunction(()=>!!document.fullscreenElement);await page.keyboard.press('f');await page.waitForFunction(()=>!document.fullscreenElement);
await level(3);before=(await state()).rails[0];await drag(before,{x:before.x-35,y:before.y});after=(await state()).rails[0];assert.equal(after.x,before.x);assert.equal(after.y,before.y);assert.ok(Math.abs(after.a-before.a)>.2,'dragging anchored body rotates it');await solve(3);
await solve(6);await page.click('#retry');await page.click('#show-hint');assert.match(await page.locator('#hint').textContent(),/גררו את קצה מסילה 1/);
await level(1);before=(await state()).rails[0];await drag(before,{x:before.x-10,y:before.y+40});after=(await state()).rails[0];assert.equal(after.y,before.y);assert.ok(after.x<before.x);assert.equal(await page.locator('#rotate').isDisabled(),true);
for(const i of [6,17,28,35,42,59]){await level(i);await page.screenshot({path:`output/puzzle-${i+1}.png`,fullPage:true});}
await level(40);const portal=(await state()).portals[0];await drag(portal,{x:100,y:100});assert.deepEqual((await state()).portals[0],portal);await solve(40);await page.screenshot({path:'output/new-won.png',fullPage:true});
await solve(54);assert.ok((await state()).switch.hold>0);await page.screenshot({path:'output/timed-won.png',fullPage:true});
await page.setViewportSize({width:390,height:844});await level(59);await page.screenshot({path:'output/new-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.ok((await page.locator('#release').boundingBox()).height>=44);
await page.click('#open-levels');assert.equal(await page.locator('#chapter-map button').count(),60);await page.screenshot({path:'output/new-mobile-map.png',fullPage:true});await page.locator('#chapter-map button').nth(6).click();
await page.setViewportSize({width:320,height:740});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'output/new-small-mobile.png',fullPage:true});
await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller);await context.setOffline(true);await page.reload();assert.equal((await state()).level,7);await context.setOffline(false);
const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const tp=await touch.newPage();await tp.goto('http://localhost:5173');await tp.waitForFunction(()=>window.render_game_to_text);await tp.evaluate(()=>{window.inputLog=[];for(const type of ['pointerdown','pointerup','click'])document.addEventListener(type,e=>window.inputLog.push({type,target:e.target.id,x:e.clientX,y:e.clientY}),true);});const tr=(await state(tp)).rails[0];await tp.locator('#game').scrollIntoViewIfNeeded();const tb=await tp.locator('#game').boundingBox(),session=await touch.newCDPSession(tp),tx=tb.x+tr.x/700*tb.width,ty=tb.y+tr.y/630*tb.height;
await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx+22,y:ty+16}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});const moved=(await state(tp)).rails[0];assert.ok(moved.x>tr.x+20);assert.ok(moved.x<=moved.edit.bounds.xMax);await tp.locator('#rotate').tap();try{await tp.waitForFunction(angle=>JSON.parse(window.render_game_to_text()).rails[0].a>angle,moved.a,{timeout:3000});}catch{throw new Error(JSON.stringify({before:moved,after:await state(tp),log:await tp.evaluate(()=>window.inputLog),box:await tp.locator('#rotate').boundingBox()}));}assert.ok((await state(tp)).rails[0].a>moved.a,JSON.stringify({before:moved,after:await state(tp),disabled:await tp.locator('#rotate').isDisabled()}));
console.log(JSON.stringify({errors,verified:['legal UI solutions 1/4/41/55','failure and retained retry','axis constraints','anchored rotation','fixed portals','ordered route progress','timed gate win','60-level map','mobile 390/320','offline cache','touch drag/clamp/rotate','saved new progress']}));assert.deepEqual(errors,[]);await browser.close();
