import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try{
 for(const width of [390,320]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  await page.goto('http://localhost:5173');await page.waitForFunction(()=>window.render_game_to_text);
  await page.click('#open-levels');await page.locator('#chapter-map button').nth(6).click();
  const read=async()=>JSON.parse(await page.evaluate(()=>window.render_game_to_text()));
  const before=(await read()).rails[0];
  await page.locator('#game').scrollIntoViewIfNeeded();const box=await page.locator('#game').boundingBox();
  const point=a=>({x:box.x+(before.x+Math.cos(a)*before.len*.35)/700*box.width,y:box.y+(before.y+Math.sin(a)*before.len*.35)/630*box.height});
  const from=point(before.a),to=point(before.a-.3),session=await context.newCDPSession(page);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});
  await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[to]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const after=(await read()).rails[0];
  assert.equal(after.x,before.x);assert.equal(after.y,before.y);assert.ok(Math.abs(after.a-(before.a-.3))<.02,`touch on rail body rotates around anchor: before ${before.a}, after ${after.a}, selected ${(await read()).selected}, width ${width}`);
  await page.click('#show-hint');assert.match(await page.locator('#hint').textContent(),/גררו את קצה מסילה 1/);
  assert.match(await page.locator('.interaction-tip').textContent(),/לסיבוב סביב העוגן/);
  await page.screenshot({path:`output/pivot-mobile-${width}.png`,fullPage:true});
  for(const [level,id] of [[20,'r0'],[30,'r0'],[43,'p0'],[53,'switch']]){
   await page.click('#open-levels');await page.locator('#chapter-map button').nth(level-1).click();
   const s=await read(),all=[...s.rails,...(s.spring?[s.spring]:[]),...s.bumpers,...s.portals,...(s.switch?[s.switch]:[])],part=all.find(p=>p.id===id);
   await page.locator('#game').scrollIntoViewIfNeeded();const b=await page.locator('#game').boundingBox(),tap={x:b.x+part.x/700*b.width,y:b.y+part.y/630*b.height};
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[tap]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   assert.equal((await read()).selected,all.findIndex(p=>p.id===id),`nearby rotation handle must not steal fixed-part touch ${width}/${level}/${id}`);
   assert.equal(await page.locator('#rotate').isDisabled(),true);
  }
  await context.close();
 }
 console.log('PASS: stage 7 anchored rail body rotates by touch on 390px and 320px; matching visible instructions.');
}finally{await browser.close();}
