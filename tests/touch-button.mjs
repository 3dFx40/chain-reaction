import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try{
 for(let n=0;n<8;n++){
  const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),p=await c.newPage();
  await p.goto('http://localhost:5173');await p.waitForFunction(()=>window.render_game_to_text);
  await p.evaluate(()=>{window.inputLog=[];for(const type of ['pointerdown','pointerup','touchstart','touchend','click'])document.addEventListener(type,e=>window.inputLog.push({type,target:e.target.id,x:e.clientX,y:e.clientY}),true);});
  const state=async()=>JSON.parse(await p.evaluate(()=>window.render_game_to_text())),r=(await state()).rails[0];
  await p.locator('#game').scrollIntoViewIfNeeded();const b=await p.locator('#game').boundingBox(),session=await c.newCDPSession(p),x=b.x+r.x/700*b.width,y=b.y+r.y/630*b.height;
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+22,y:y+16}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const before=await state();await p.locator('#rotate').tap();
  try{await p.waitForFunction(a=>JSON.parse(window.render_game_to_text()).rails[0].a>a,before.rails[0].a,{timeout:2000});}
  catch{await p.screenshot({path:'output/touch-button-failure.png',fullPage:true});throw new Error(JSON.stringify({before,after:await state(),log:await p.evaluate(()=>window.inputLog),box:await p.locator('#rotate').boundingBox()}));}
  assert.equal((await state()).mode,'edit');assert.ok(Math.abs((await state()).rails[0].a-before.rails[0].a-Math.PI/12)<.0001,'one tap must rotate exactly once');console.log('Touch button repeat',n+1,'PASS');await c.close();
 }
}finally{await browser.close();}
