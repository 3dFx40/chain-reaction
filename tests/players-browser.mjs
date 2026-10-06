import {chromium} from 'playwright';
import fs from 'node:fs';
import {movableItems} from '../editor.js';
import assert from 'node:assert/strict';
const fixtures=JSON.parse(fs.readFileSync(new URL('./solutions.json',import.meta.url)));
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1050}});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const state=async(p=page)=>JSON.parse(await p.evaluate(()=>window.render_game_to_text()));
const parts=movableItems;
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
  if(target.power!==undefined){for(let k=0;k<3&&parts(await state(p)).find(v=>v.id===id).power!==target.power;k++)await p.click('#power');}
  const actual=parts(await state(p)).find(v=>v.id===id);if(target.power!==undefined)assert.equal(actual.power,target.power);assert.ok(Math.abs(actual.x-target.x)<.01&&Math.abs(actual.y-target.y)<.01&&Math.abs(actual.a-target.a)<.01,`legal UI setup ${index+1}/${id}: actual ${JSON.stringify(actual)}, target ${JSON.stringify(target)}, selected ${(await state(p)).selected}`);
 }
 await p.click('#release');await p.evaluate(()=>window.advanceTime(9000));const s=await state(p);assert.equal(s.mode,'won',`stage ${index+1}: ${s.failure}`);assert.equal(s.routeIndex,s.route.length);
}
await page.goto('http://localhost:5173');await page.waitForFunction(()=>window.render_game_to_text);
await page.click('#open-player');await page.fill('#username','דני');await page.click('#player-form .primary');
assert.equal((await state()).player,'דני');await solve(0);
await page.click('#open-scores');assert.match(await page.locator('#score-rows').innerText(),/דני/);

// Select by the current level's stable id rather than depending on campaign naming.
await page.selectOption('#score-level',await page.locator('#score-level option').nth(1).getAttribute('value'));
assert.equal(await page.locator('#score-rows tr').count(),1);
await page.screenshot({path:'output/players-desktop.png',fullPage:true});await page.click('#close-scores');
await page.reload();assert.equal((await state()).player,'דני');assert.deepEqual((await state()).completed,[0]);
await page.click('#open-player');await page.fill('#username','נועה');await page.keyboard.press('r');assert.equal((await state()).attempts,1);await page.fill('#username','נועה');await page.click('#player-form .primary');
assert.equal((await state()).player,'נועה');assert.deepEqual((await state()).completed,[]);
await solve(0);await page.click('#open-scores');assert.equal(await page.locator('#score-rows tr').count(),2);await page.click('#close-scores');
await page.click('#open-player');await page.fill('#username','דני');await page.click('#player-form .primary');assert.match(await page.locator('#player-error').innerText(),/כבר קיים/);
await page.getByRole('button',{name:'דני',exact:true}).click();assert.equal((await state()).player,'דני');
await page.setViewportSize({width:320,height:780});await page.click('#open-scores');
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await page.screenshot({path:'output/players-mobile.png',fullPage:true});await page.click('#close-scores');
await page.click('#open-player');await page.screenshot({path:'output/players-select-mobile.png',fullPage:true});await page.click('#play-guest');assert.equal((await state()).player,null);
await context.setOffline(true);await page.reload();await page.waitForFunction(()=>window.render_game_to_text);await page.click('#open-player');await page.getByRole('button',{name:'נועה',exact:true}).click();assert.equal((await state()).player,'נועה');
assert.deepEqual(errors,[]);console.log('PASS: real wins, profile isolation, duplicate names, leaderboard, reload, 320px layout, modal keyboard and offline profiles');await browser.close();
