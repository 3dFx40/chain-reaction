import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createWorld,createFromDefinition,startWorld,resetWorld,stepWorld,levels} from '../physics.js';
import {movableItems,canMove,canRotate,moveItem,rotateItem,setPower,overlapsWall} from '../editor.js';
import {readProgress,saveProgress} from '../progress-storage.js';
const fixtures=JSON.parse(fs.readFileSync(new URL('./solutions.json',import.meta.url)));
assert.equal(levels.length,90);assert.equal(fixtures.length,90);assert.equal(levels[29].id,'legacy-60');
function run(w){startWorld(w);for(let i=0;i<1400&&w.mode==='running';i++)stepWorld(w,1/120);return w;}
for(const {index,config} of fixtures){
 const w=createWorld(index);
 for(const p of movableItems(w)){const target=config[p.id];if(!target)continue;if(canMove(p))moveItem(p,target.x,target.y,w);if(canRotate(p))rotateItem(p,target.a,w);if(target.power!==undefined)setPower(p,target.power);assert.equal(p.x,target.x);assert.equal(p.y,target.y);assert.ok(Math.abs(p.a-target.a)<1e-10);if(target.power!==undefined)assert.equal(p.power,target.power);}
 run(w);assert.ok(movableItems(w).filter(p=>p.id!=='p0'&&p.id!=='p1'&&p.id!=='switch').every(p=>!overlapsWall(p,w.walls)));assert.equal(w.mode,'won',`level ${index+1}: ${w.failure}`);assert.equal(w.routeIndex,w.route.length);assert.ok(Number.isFinite(w.ball.x)&&Number.isFinite(w.ball.vy));
 const arrangement=structuredClone(movableItems(w));resetWorld(w);assert.deepEqual(movableItems(w),arrangement);assert.equal(w.routeIndex,0);assert.equal(w.switchOn,false);
 const initial=createWorld(index);run(initial);assert.equal(initial.mode,'failed',`level ${index+1} needs intervention`);if(initial.hazards.length)assert.match(initial.failure,/מלכודת/,`level ${index+1}: trap must catch a real incorrect setup`);
 for(const p of movableItems(createWorld(index))){const before=structuredClone(p);moveItem(p,-10000,10000);if(!canMove(before)){assert.equal(p.x,before.x);assert.equal(p.y,before.y);}else{assert.ok(p.x>=p.edit.bounds.xMin&&p.x<=p.edit.bounds.xMax&&p.y>=p.edit.bounds.yMin&&p.y<=p.edit.bounds.yMax);if(p.edit.move==='x')assert.equal(p.y,before.y);if(p.edit.move==='y')assert.equal(p.x,before.x);}rotateItem(p,2);if(!canRotate(before))assert.equal(p.a,before.a);}
 const bypass=createWorld(index);startWorld(bypass);bypass.ball.x=bypass.goal.x;bypass.ball.y=bypass.goal.y;stepWorld(bypass,1/120);assert.notEqual(bypass.mode,'won',`stage ${index+1}: direct goal bypass`);
 if(w.switch?.hold){w.switch.hold=.02;run(w);assert.equal(w.mode,'failed');assert.match(w.failure,/הזמן/);}
}
const hazard=createFromDefinition({ball:{x:100,y:100},goal:{x:600,y:500},route:[],hazards:[{x:70,y:180,w:100,h:20}]});run(hazard);assert.equal(hazard.mode,'failed');assert.match(hazard.failure,/מלכודת/);
const wall=createFromDefinition({ball:{x:100,y:100},goal:{x:600,y:500},route:[],walls:[{x:60,y:200,w:150,h:20}]});startWorld(wall);for(let n=0;n<360;n++)stepWorld(wall,1/120);assert.ok(wall.ball.y<200);
const wrong=createWorld(25);startWorld(wrong);wrong.ball.x=wrong.switch.x;wrong.ball.y=wrong.switch.y;stepWorld(wrong,1/120);assert.equal(wrong.mode,'failed');assert.match(wrong.failure,/בסדר הלא נכון/);
const component={x:100,y:100,a:0,len:80,edit:{move:'zone',rotate:true,bounds:{xMin:50,xMax:300,yMin:50,yMax:300}}},block={walls:[{x:180,y:60,w:20,h:200}]};assert.equal(moveItem(component,190,100,block),false);assert.equal(component.x,100);
const storage=new Map([['chain-v2-completed','[0,6,59]'],['chain-v2-current','59']]);storage.getItem=k=>storage.get(k);storage.setItem=(k,v)=>storage.set(k,v);const migrated=readProgress(storage,levels);assert.equal(migrated.current,29);assert.deepEqual(migrated.done,[0,3,29]);saveProgress(storage,levels,migrated.done,89);assert.equal(readProgress(storage,levels).current,89);assert.deepEqual(readProgress(storage,levels).done,migrated.done);
const dual=createWorld(60);startWorld(dual);dual.switchStates.switch=0;assert.equal(dual.switches.length,2);assert.equal((await import('../physics-core.js')).gateOpen(dual),false);dual.switchStates.switch2=0;assert.equal((await import('../physics-core.js')).gateOpen(dual),true);resetWorld(dual);assert.deepEqual(dual.switchStates,{});
for(const {index,config} of fixtures.slice(70)){for(const [id,target] of Object.entries(config)){if(target.power===undefined)continue;const outcomes=[];for(const power of createWorld(index).springs.find(s=>s.id===id).powerOptions.filter(p=>p!==target.power)){const probe=createWorld(index);for(const p of movableItems(probe))if(config[p.id])Object.assign(p,config[p.id]);probe.springs.find(s=>s.id===id).power=power;outcomes.push(run(probe).mode);}assert.ok(outcomes.includes('failed'),`level ${index+1}/${id}: power selection must affect the route`);}}
console.log('PASS: 90 legal solutions, failed initial layouts, ordered routes, powers, dual switches, timed gates, portals, constraints, retries and saved-progress migration.');
