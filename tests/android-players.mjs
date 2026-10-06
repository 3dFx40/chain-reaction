import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const serial=process.argv[process.argv.indexOf('--serial')+1];
assert.ok(process.argv.includes('--serial')&&serial,'Pass --serial with the authorized Android device ID');
const adb=process.env.CHAIN_ADB||'adb',out='output/android-device';fs.mkdirSync(out,{recursive:true});
const run=(...args)=>execFileSync(adb,['-s',serial,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function nodes(){try{run('shell','uiautomator','dump','/sdcard/chain-ui.xml');}catch(error){if(!error.stdout?.includes('UI hierchary dumped to: /sdcard/chain-ui.xml'))throw error;}run('pull','/sdcard/chain-ui.xml',out+'/ui.xml');return [...fs.readFileSync(out+'/ui.xml','utf8').matchAll(/<node\s+([^>]+)/g)].map(m=>Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(a=>[a[1],a[2]])));}
const bounds=n=>(n?.bounds||'').match(/\d+/g)?.map(Number),byId=(ns,id)=>ns.find(n=>n['resource-id']===id);
function tap(n){const b=bounds(n);assert.ok(b&&b[3]>b[1]&&b[2]>b[0],'Visible touch control: '+n?.['resource-id']);run('shell','input','tap',String(Math.round((b[0]+b[2])/2)),String(Math.round((b[1]+b[3])/2)));}
async function ready(id){for(let n=0;n<5;n++){const ns=nodes();if(byId(ns,id))return ns;await wait(500);}throw Error('Control did not load: '+id);}
function capture(name){run('shell','screencap','-p','/sdcard/chain-check.png');run('pull','/sdcard/chain-check.png',out+'/'+name+'.png');}


run('shell','am','start','-W','-n','com.chainreaction.game/.MainActivity');
let ns=await ready('open-player');const player=byId(ns,'open-player').text,completed=byId(ns,'completed').text;
assert.notEqual(player,'בחירת שחקן','A named player is active on the real phone');
tap(byId(ns,'open-scores'));ns=await ready('score-level');assert.ok(ns.some(n=>n.text===player));capture('players-table');
run('shell','input','keyevent','4');ns=await ready('open-player');assert.equal(byId(ns,'open-player').text,player);
run('shell','am','force-stop','com.chainreaction.game');run('shell','am','start','-W','-n','com.chainreaction.game/.MainActivity');ns=await ready('open-player');assert.equal(byId(ns,'open-player').text,player);assert.equal(byId(ns,'completed').text,completed);
tap(byId(ns,'open-scores'));ns=await ready('score-level');assert.ok(ns.some(n=>n.text===player));capture('players-table-after-restart');run('shell','input','keyevent','4');
fs.writeFileSync(out+'/players-result.json',JSON.stringify({namedPlayer:player,completed,leaderboard:true,nativeBack:true,coldRestartProfileAndScores:true},null,2));
console.log('PASS ANDROID: named player, leaderboard, native Back, preserved selected profile and progress after cold restart');
