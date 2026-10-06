import {chromium} from 'playwright';
import fs from 'node:fs';
fs.mkdirSync('docs/screenshots',{recursive:true});
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto('http://localhost:5173/?native=1');await page.waitForFunction(()=>window.render_game_to_text);await page.evaluate(()=>document.fonts.ready);
 for(const [index,name] of [[0,'first-puzzle'],[9,'rail-controls'],[42,'portals'],[59,'final-chain']]){
  await page.click('#open-levels');await page.locator('#chapter-map button').nth(index).click();
  await page.screenshot({path:`docs/screenshots/${name}.png`,fullPage:true});
 }
 console.log('Saved four mobile gameplay screenshots for the public README.');
} finally {await browser.close();}
