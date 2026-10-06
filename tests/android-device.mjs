import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {puzzles} from '../level-data.js';
import {movableItems} from '../editor.js';
import {createFromDefinition,startWorld,stepWorld} from '../physics-core.js';
const serial=process.argv[process.argv.indexOf('--serial')+1];
assert.ok(process.argv.includes('--serial')&&serial,'Pass --serial with the authorized Android device ID');
const adb=process.env.CHAIN_ADB||'adb',out='output/android-device';fs.mkdirSync(out,{recursive:true});
const answers=JSON.parse(fs.readFileSync(new URL('./solutions.json',import.meta.url)));
const run=(...args)=>execFileSync(adb,['-s',serial,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const screen=run('shell','wm','size').match(/(?:Override|Physical) size: (\d+)x(\d+)/g).at(-1).match(/(\d+)x(\d+)/).slice(1).map(Number),[sw,sh]=screen;
function nodes(){try{run('shell','uiautomator','dump','/sdcard/chain-ui.xml');}catch(error){if(!error.stdout?.includes('UI hierchary dumped to: /sdcard/chain-ui.xml'))throw error;}run('pull','/sdcard/chain-ui.xml',out+'/ui.xml');return [...fs.readFileSync(out+'/ui.xml','utf8').matchAll(/<node\s+([^>]+)/g)].map(m=>Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(a=>[a[1],a[2]])));}
const bounds=n=>(n?.bounds||'').match(/\d+/g)?.map(Number),byId=(ns,id)=>ns.find(n=>n['resource-id']===id);
function tap(n){const b=bounds(n);assert.ok(b&&b[3]>b[1]&&b[2]>b[0],'Visible touch control: '+n?.['resource-id']);run('shell','input','tap',String(Math.round((b[0]+b[2])/2)),String(Math.round((b[1]+b[3])/2)));}
async function ready(id){for(let n=0;n<5;n++){const ns=nodes();if(byId(ns,id))return ns;await wait(500);}throw Error('Control did not load: '+id);}
function capture(name){run('shell','screencap','-p','/sdcard/chain-check.png');run('pull','/sdcard/chain-check.png',out+'/'+name+'.png');}
async function choose(level){const opener=byId(nodes(),'open-levels');if(opener)tap(opener);await wait(150);for(let i=0;i<22;i++){const ns=nodes(),n=ns.find(n=>n.class==='android.widget.Button'&&(n['content-desc']?.startsWith('שלב '+level+':')||n.text?.startsWith('שלב '+level+':')||n.text===String(level).padStart(2,'0'))),b=bounds(n);if(b&&b[3]>b[1]&&b[1]>sh*.055&&b[3]<sh*.93){tap(n);await ready('game');return;}const up=!(b&&b[1]<sh*.055);run('shell','input','swipe',String(Math.round(sw*.5)),String(Math.round(sh*(up?.8:.32))),String(Math.round(sw*.5)),String(Math.round(sh*(up?.32:.8))),'400');}throw Error('Level map cannot reach '+level);}
function gesture(box,from,to){const p=v=>({x:Math.round(box[0]+v.x/700*(box[2]-box[0])),y:Math.round(box[1]+v.y/700*(box[2]-box[0]))}),a=p(from),b=p(to);run('shell','input','swipe',String(a.x),String(a.y),String(b.x),String(b.y),'500');}
function duration(index){const w=createFromDefinition(puzzles[index]);for(const p of movableItems(w))if(answers[index].config[p.id])Object.assign(p,answers[index].config[p.id]);startWorld(w);for(let i=0;i<1500&&w.mode==='running';i++)stepWorld(w,1/120);assert.equal(w.mode,'won');return Math.ceil(w.time*1000+2200);}
const requested=process.argv.includes('--levels')?process.argv[process.argv.indexOf('--levels')+1].split(',').map(Number):[1,4,5,10,15,20,25,30,33,45,61,67,71,75,80,88,90],results=[];
run('shell','input','keyevent','224');run('shell','am','start','-W','-n','com.chainreaction.game/.MainActivity');await ready('open-levels');
for(const level of requested){
 await choose(level);let ns=nodes(),box=bounds(byId(ns,'game'));
 if(box[1]+(box[2]-box[0])*.9>sh*.88){run('shell','input','swipe','15',String(Math.round(sh*.8)),'15',String(Math.round(sh*.3)),'450');ns=nodes();box=bounds(byId(ns,'game'));}
 const def=structuredClone(puzzles[level-1]),items=movableItems(def);
 for(const [id,target] of Object.entries(answers[level-1].config)){
  const item=items.find(p=>p.id===id);if(item.fixed)continue;
  if(item.edit.move!=='none'&&(Math.abs(item.x-target.x)>.01||Math.abs(item.y-target.y)>.01)){gesture(box,item,target);Object.assign(item,{x:target.x,y:target.y});}
  if(item.edit.rotate){const hx=item.len?item.len/2+35:57,hy=item.len?4:0,h=a=>({x:item.x+Math.cos(a)*hx-Math.sin(a)*hy,y:item.y+Math.sin(a)*hx+Math.cos(a)*hy});gesture(box,h(item.a),h(target.a));item.a=target.a;}
  if(target.power!==undefined){for(let k=0;k<3&&item.power!==target.power;k++){tap(byId(nodes(),'power'));item.power=item.powerOptions[(item.powerOptions.indexOf(item.power)+1)%item.powerOptions.length];}}
 }
 capture('level-'+level+'-arranged');run('shell','dumpsys','gfxinfo','com.chainreaction.game','reset');tap(byId(nodes(),'release'));await wait(duration(level-1));ns=nodes();capture('level-'+level+'-result');
 const won=ns.some(n=>n.text==='הכול התחבר'),status=ns.filter(n=>['result-title','result-description','status'].includes(n['resource-id'])).map(n=>n.text);results.push({level,won,status});fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));assert.ok(won,'Device level '+level+' failed: '+status.join(' / '));
 if([30,90].includes(level))fs.writeFileSync(out+'/level-'+level+'-gfx.txt',run('shell','dumpsys','gfxinfo','com.chainreaction.game'));
 tap(byId(ns,'retry'));ns=nodes();assert.ok(ns.some(n=>n.text==='מוכנים לניסוי'));assert.ok(ns.some(n=>n['resource-id']==='attempt'&&n.text.includes('02')),'One tap causes one retry');console.log('ANDROID '+level+'/90: touch setup, powers, win and retry PASS');
}
await choose(1);tap(byId(nodes(),'release'));await wait(7000);let ns=nodes();assert.ok(ns.some(n=>n.text==='כמעט.'),'Initial mistake fails clearly');tap(byId(ns,'retry'));assert.ok(nodes().some(n=>n.text==='מוכנים לניסוי'));
run('shell','input','swipe','15',String(Math.round(sh*.3)),'15',String(Math.round(sh*.8)),'450');ns=nodes();tap(byId(ns,'help'));assert.ok(byId(nodes(),'got-it'));run('shell','input','keyevent','4');ns=await ready('open-levels');
tap(byId(ns,'sound'));ns=nodes();assert.equal(byId(ns,'sound').text,'♫̸');tap(byId(ns,'sound'));ns=nodes();assert.equal(byId(ns,'sound').text,'♪');
const completed=byId(ns,'completed').text;run('shell','input','keyevent','3');run('shell','am','start','-W','-n','com.chainreaction.game/.MainActivity');ns=await ready('completed');assert.equal(byId(ns,'completed').text,completed);
run('shell','am','force-stop','com.chainreaction.game');run('shell','am','start','-W','-n','com.chainreaction.game/.MainActivity');ns=await ready('completed');assert.equal(byId(ns,'completed').text,completed);await choose(30);
fs.writeFileSync(out+'/ui-result.json',JSON.stringify({failure:true,retry:true,nativeBack:true,help:true,mute:true,resume:true,coldRestartSavedProgress:true}));console.log('ANDROID UI: failure, help, native Back, sound toggle, resume and persistent progress PASS');
