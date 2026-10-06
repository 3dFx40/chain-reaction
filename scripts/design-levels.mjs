import fs from 'node:fs';
import {createFromDefinition,startWorld,stepWorld} from '../physics-core.js';
import {overlapsWall} from '../editor.js';

// Each row defines a different route topology, editing rule and flight geometry.
// The offline simulation places receivers on an authored successful trajectory.
// It never changes the puzzle at runtime or searches on behalf of the player.
const plans=[
 ['rail',1,'zone',1,190,.24,400],['rail',1,'x',1,270,.5,520],['rail',1,'y',-1,240,.42,455],['rail',2,'pivot',1,190,.3,530],['rail',2,'pivot',-1,220,.54,490],['rail',2,'mixed',1,260,.2,550],['rail',3,'pivot',1,170,.45,540],['rail',2,'y',-1,180,.68,410],['rail',3,'mixed',-1,200,.3,560],['rail',2,'x',1,285,.48,470],
 ['domino',1,'pivot',1,210,.3,440],['domino',1,'x',-1,260,.42,540],['domino',2,'pivot',1,170,.55,510],['domino',1,'y',1,310,.2,390],['domino',2,'mixed',-1,210,.35,480],['domino',1,'pivot',-1,180,.62,400],['domino',3,'pivot',1,155,.3,545],['domino',2,'x',1,220,.4,445],['domino',2,'y',-1,170,.55,550],['domino',3,'mixed',-1,150,.35,475],
 ['spring',0,'pivot',1,390,.7,250],['spring',0,'pivot',-1,440,.5,390],['spring',1,'pivot',1,200,.35,290],['spring',0,'y',1,510,1.0,355],['spring',1,'mixed',-1,185,.45,470],['spring',1,'pivot',1,230,.25,180],['spring',0,'pivot',-1,470,1.15,220],['spring',2,'pivot',1,175,.4,500],['spring',1,'x',-1,260,.3,310],['spring',2,'mixed',-1,160,.5,410],
 ['bumper',0,'pivot',1,275,.4,520],['bumper',0,'pivot',-1,360,.6,290],['bumper',1,'pivot',1,185,.28,420],['bumper',0,'pivot',1,420,1.0,210],['bumper',1,'mixed',-1,230,.5,520],['double',0,'pivot',1,310,.55,440],['double',1,'pivot',-1,175,.3,320],['bumper',2,'pivot',1,160,.45,510],['double',0,'pivot',-1,440,.8,245],['double',1,'mixed',1,205,.42,460],
 ['portal',1,'pivot',1,200,.35,515],['portal',1,'pivot',-1,240,.5,360],['portal',2,'pivot',1,170,.4,480],['portal',1,'x',1,300,.24,420],['portal',1,'y',-1,185,.6,540],['portal',2,'mixed',-1,180,.3,320],['portal',1,'pivot',1,230,.55,240],['portal',2,'x',1,160,.4,550],['portal',2,'y',-1,210,.42,400],['portal',2,'mixed',1,175,.65,500],
 ['switch',1,'pivot',1,200,.26,520],['switch',1,'x',-1,245,.4,455],['switch',2,'pivot',1,175,.5,530],['switch',1,'y',1,300,.2,470],['timed',2,'pivot',-1,185,.38,510],['timed',1,'pivot',1,210,.65,440],['switchSpring',1,'mixed',-1,210,.35,340],['timedSpring',1,'pivot',1,185,.45,450],['switchPortal',2,'pivot',-1,160,.4,495],['timedDouble',1,'mixed',1,180,.35,530]
];
const names=[['המסילה הראשונה','תנועה בציר אחד','גובה במקום זווית','להחליף כיוון','מסלול חוזר','גשר מעל מלכודת','שלוש תחנות','חלון בגובה','בלי להזיז את העוגן','החיבור האחרון'],['דחיפה על מדף','גם שמאלה','להחזיר את התנופה','נגיעה בגובה','שני כיוונים','בלי לפגוע ביעד','מעבר בשלוש מסילות','גשר לשורה','חלון לדומינו','להפיל את האחרון'],['לעלות בחזרה','קשת לצד השני','לתפוס לפני שקופצים','גובה הקפיץ','מכיוון אחר','יעד מעל המקור','קפיצה תלולה','שרשרת לפני הקפיצה','להחליף גובה ותנופה','מסלול עולה'],['ריקושט ראשון','חזרה שמאלה','מסילה לפני גומי','עלייה תלולה','הפגיעה השנייה','שני פגושים','להסתובב באמצע','שלוש פגיעות','לחזור מעל המלכודת','לאן הולך החץ'],['הכניסה קבועה','להגיע מהצד השני','לפני ואחרי','מסילה נעה, שער קבוע','חלון לכניסה','דרך מקופלת','היעד למעלה','לשמור תנופה ביציאה','סדר בתוך המרחב','קיצור דרך ארוך'],['המתג באמצע','לחזור דרך השער','רק אחרי המסילה','פגיעה לפני היעד','יש זמן מוגבל','לא לאבד מהירות','להפעיל ואז לקפוץ','קפיצה נגד השעון','שלושה חלקים ומתג','השרשרת האחרונה']].flat();

function simulate(d){const w=createFromDefinition(d);startWorld(w);const trace=[];for(let i=0;i<1150&&w.mode==='running';i++){stepWorld(w,1/120);trace.push({x:w.ball.x,y:w.ball.y,t:w.time,ids:[...w.visited],vx:w.ball.vx,vy:w.ball.vy});}return {w,trace};}
function receiver(trace,id,delay=.32,minY=100,maxY=475,falling=true){const after=trace.find(p=>p.ids.includes(id));if(!after)return null;return trace.find(p=>p.t>after.t+delay&&p.x>90&&p.x<610&&p.y>minY&&p.y<maxY&&(!falling||p.vy>50))||null;}
function addRail(d,point,a,len=170){const r={id:'r'+d.rails.length,label:'מסילה '+(d.rails.length+1),x:point.x,y:point.y+21,a,len};d.rails.push(r);return r;}
function endPoint(trace,route,y){const options=trace.filter(p=>route.every(id=>p.ids.includes(id))&&p.x>70&&p.x<635&&p.y>110&&p.y<555);if(!options.length)return null;const first=options[0].t;const earlier=trace.filter(q=>!route.every(id=>q.ids.includes(id)));const later=options.filter(p=>p.t>first+.35&&earlier.every(q=>Math.hypot(q.x-p.x,q.y-p.y)>46));if(!later.length)return null;return later.reduce((best,p)=>Math.abs(p.y-y)<Math.abs(best.y-y)?p:best);}
function blockShortcut(d,trace,n){
 if(n<2)return;
 const candidates=trace.filter(p=>p.t>.7&&p.x>160&&p.x<540&&p.y>150&&p.y<480);
 for(const p of candidates.filter((_,i)=>i%15===0)){
  if(d.portals&&Math.abs(p.x-d.portals[1].x)<55)continue;
  if(d.rails.some(r=>Math.abs(r.x-p.x)<r.len/2+25))continue;
  const close=trace.filter(q=>Math.abs(q.x-p.x)<25),ys=close.map(q=>q.y),low=Math.min(...ys),high=Math.max(...ys);if(high-low>75)continue;
  const mid=(high+low)/2,gap=Math.max(78,high-low+53),x=p.x-7;
  const walls=[{x,y:42,w:14,h:mid-gap/2-42},{x,y:mid+gap/2,w:14,h:580-mid-gap/2}].filter(w=>w.h>20);
  if([...d.rails,...(d.spring?[d.spring]:[]),...(d.bumpers||[])].some(p=>overlapsWall(p,walls)))continue;
  d.walls=walls;const result=simulate(d);if(result.w.mode==='won')return;d.walls=[];
 }
}
function editRules(d,n,mode){
 const editable=[...d.rails,...(d.spring?[d.spring]:[]),...(d.bumpers||[])];
 for(const [i,p] of editable.entries()){
  // Avoid many independent degrees of freedom: at most three movable parts.
  const fixed=(mode==='mixed'&&i===0&&editable.length>1)||(editable.length>3&&i===0);p.fixed=fixed;
  const movement=mode==='pivot'||fixed?'none':mode==='mixed'?(i%2?'y':'none'):mode;
  const travel=movement==='y'?120:movement==='x'?80:38;
  p.edit={move:movement,rotate:!fixed&&((movement!=='x'&&movement!=='y')||i>0),bounds:{xMin:Math.max(60,p.x-travel),xMax:Math.min(640,p.x+travel),yMin:Math.max(90,p.y-travel),yMax:Math.min(550,p.y+travel)},angle:p.len?[-1.3,1.3]:[-Math.PI,-.12]};
  if(fixed)p.edit.rotate=false;
 }
 for(const p of d.portals||[])p.fixed=true;
 if(d.switch)d.switch.fixed=true;
}
function perturb(d,index){const config={};for(const p of [...d.rails,...(d.spring?[d.spring]:[]),...(d.bumpers||[])]){config[p.id]={x:p.x,y:p.y,a:p.a};if(p.fixed)continue;if(p.edit.rotate){const answer=p.a,angles=[answer+(index%2?-.7:.75),answer-.75,answer+.75,answer-.45,answer+.45,0];p.a=angles.map(a=>Math.max(p.edit.angle[0],Math.min(p.edit.angle[1],a))).find(a=>!overlapsWall({...p,a},d.walls)&&Math.abs(a-answer)>.1)??answer;}else if(p.edit.move==='x'){const xs=[p.x+Math.sign(p.x-d.ball.x)*72,p.x-72,p.x+72].map(x=>Math.max(p.edit.bounds.xMin,Math.min(p.edit.bounds.xMax,x)));p.x=xs.find(x=>!overlapsWall({...p,x},d.walls)&&Math.abs(x-p.x)>20)??p.x;}else if(p.edit.move==='y'){const ys=[p.y+(index%2?110:-110),p.y-110,p.y+110,p.y-60,p.y+60].map(y=>Math.max(p.edit.bounds.yMin,Math.min(p.edit.bounds.yMax,y)));p.y=ys.find(y=>!overlapsWall({...p,y},d.walls)&&Math.abs(y-p.y)>20)??p.y;}}return config;}

function relevantObstacles(d,answer,successful,n){
 const distance=(p,r)=>Math.hypot(p.x-Math.max(r.x,Math.min(r.x+r.w,p.x)),p.y-Math.max(r.y,Math.min(r.y+r.h,p.y)));
 const wrong=simulate({...d,walls:[],hazards:[]}).trace;
 // A wall stays only when it blocks an actual initial mistake.
 d.walls=d.walls.filter(r=>wrong.some(p=>distance(p,r)<18));
 d.hazards=[];
 if(n===0)return;
 const parts=[...d.rails,...(d.spring?[d.spring]:[]),...(d.bumpers||[]),...(d.portals||[]),...(d.switch?[d.switch]:[])];
 for(const p of wrong.filter((p,i)=>i%8===0&&p.t>.65&&p.vy>30&&p.x>75&&p.x<625&&p.y>175&&p.y<530)){
  const r={x:p.x-42,y:p.y+14,w:84,h:16};
  if(successful.some(q=>distance(q,r)<45))continue;
  if(distance(d.goal,r)<55)continue;
  if(parts.some(q=>overlapsWall(q,[r])||overlapsWall({...q,...answer[q.id]},[r])))continue;
  if(d.walls.some(q=>distance({x:p.x,y:r.y},q)<35))continue;
  const probe=simulate({...d,hazards:[r]});
  if(probe.w.failure.includes('מלכודת')){d.hazards=[r];break;}
 }
}

const authored=[],fixtures=[];
for(let index=0;index<60;index++){
 const [kind,count,mode,dir,baseY,slope,targetY]=plans[index],chapter=Math.floor(index/10),n=index%10;
 let complete=null;
 for(let variant=0;variant<90&&!complete;variant++){
  const d={chapter,number:n+1,name:names[index],ball:{x:dir>0?95+variant%5*6:605-variant%5*6,y:65+(n%3)*13},goal:{x:-10000,y:-10000,r:n<3?22:17},rails:[],dominoes:[],walls:[],hazards:[],route:[],timeLimit:8};
  let last=null,valid=true;
  for(let r=0;r<count;r++){
   let point;
   if(r===0)point={x:d.ball.x+dir*68,y:baseY-21+variant%4*5};else {const previous=d.rails.at(-1),trace=simulate(d).trace;point=receiver(trace.filter(p=>Math.abs(p.x-previous.x)>previous.len/2+32&&p.y>previous.y+45),last,0,100,465);}
   if(!point){valid=false;break;}
   const a=r===0?dir*(slope+(variant%7-3)*.025):(r%2?-dir:dir)*(.25+(n%4)*.12+(variant%3)*.04),rail=addRail(d,point,a,r===0?200:150+(n%3)*15);last=rail.id;d.route.push(last);
  }
  if(!valid)continue;
  if(kind==='switchSpring'||kind==='timedSpring'){const point=receiver(simulate(d).trace,last,.3,d.rails.at(-1).y+65,470);if(!point)continue;d.switch={id:'switch',label:'מתג',x:point.x,y:point.y};last='switch';d.route.push(last);}
  const hasSpring=kind.toLowerCase().includes('spring');
  if(hasSpring||kind==='bumper'||kind==='double'||kind==='timedDouble'){
   const minY=d.switch?d.switch.y+65:count?d.rails.at(-1).y+70:100;
   const point=count?receiver(simulate(d).trace,last,.27,minY,540):{x:d.ball.x,y:baseY};if(!point)continue;
   const launchDir=point.x>430?-1:point.x<270?1:dir;
   const angle=launchDir>0?-(.35+(n%5)*.17+variant%4*.05):-Math.PI+(.35+(n%5)*.17+variant%4*.05);
   if(hasSpring){d.spring={id:'s0',label:'קפיץ',x:point.x,y:point.y+10,a:angle,power:500+(n%3)*30};last='s0';}
   else {d.bumpers=[{id:'b0',label:'פגוש 1',x:point.x,y:point.y+10,a:angle,r:25}];last='b0';}
   d.route.push(last);
   if(kind==='double'||kind==='timedDouble'){
    if(kind==='timedDouble'){const check=receiver(simulate(d).trace,last,.22,100,500,false);if(!check)continue;d.switch={id:'switch',label:'מתג',x:check.x,y:check.y};last='switch';d.route.push(last);}
    const next=receiver(simulate(d).trace,last,.38,100,495,false);if(!next)continue;
    const a=dir>0?-2.0+(variant%5)*.13:-1.1-(variant%5)*.13;d.bumpers.push({id:'b1',label:'פגוש 2',x:next.x,y:next.y+8,a,r:25,power:430});last='b1';d.route.push(last);
   }
  }
  if(kind==='portal'||kind==='switchPortal'){
   const point=receiver(simulate(d).trace,last,.3,d.rails.at(-1).y+65,540);if(!point)continue;
   const exitX=count>1?(point.vx>0?95:605):(point.vx>0?340+(n%3)*35:360-(n%3)*35);
   d.portals=[{id:'p0',label:'כניסה',x:point.x,y:point.y+8},{id:'p1',label:'יציאה',x:exitX,y:110+(n%3)*55}];last='portal';d.route.push(last);
   if(n%2===0||kind==='switchPortal'){
    const exit=receiver(simulate(d).trace,last,.18,100,470);if(!exit)continue;
    const r=addRail(d,exit,dir*(.22+(n%3)*.18),145);last=r.id;d.route.push(last);
   }
  }
  if(chapter===5&&!d.switch){const onRail=last?.startsWith('r'),minY=onRail?d.rails.at(-1).y+65:100;const point=receiver(simulate(d).trace,last,onRail?.35:.2,minY,540,onRail);if(!point)continue;d.switch={id:'switch',label:'מתג',x:point.x,y:point.y};d.route.push('switch');last='switch';}
  const before=simulate(d),endpoint=endPoint(before.trace,d.route,targetY);if(!endpoint)continue;
  if(kind==='domino'){
   const routeTime=before.trace.find(p=>d.route.every(id=>p.ids.includes(id)))?.t||0;
   const size=2+(n%3),spacing=44+(n%4)*3;
   const point=before.trace.filter(p=>p.t>routeTime+.3&&p.vy>80&&p.y>Math.max(230,d.rails.at(-1).y+70)&&p.y<535&&p.x>80&&p.x<620).find(p=>p.x+dir*((size-1)*spacing+65)>65&&p.x+dir*((size-1)*spacing+65)<635);
   if(!point)continue;
   const y=point.y+38;d.dominoes=Array.from({length:size},(_,j)=>({x:point.x+dir*j*spacing,y,dir,height:80}));d.goal={x:d.dominoes.at(-1).x+dir*55,y:y-15,r:20,onlyDomino:true};d.route.push('domino');
  }else d.goal={x:endpoint.x,y:endpoint.y,r:n<3?22:17};
  if(d.switch){d.gate={x:d.goal.x,y:d.goal.y-47,len:72};if(kind.startsWith('timed')){const switchAt=before.trace.find(p=>p.ids.includes('switch'));d.switch.hold=+(Math.max(.65,endpoint.t-switchAt.t+.25)).toFixed(2);}}
  const result=simulate(d);if(result.w.mode!=='won')continue;
  blockShortcut(d,result.trace,n);
  if(simulate(d).w.mode!=='won')continue;
  editRules(d,n,mode);const answer=perturb(d,index);
  if(simulate(d).w.mode==='won')continue;
  relevantObstacles(d,answer,result.trace,n);
  const movable=[...d.rails,...(d.spring?[d.spring]:[]),...(d.bumpers||[])].filter(p=>!p.fixed);
  d.description=kind==='domino'?'הדומינו האחרון חייב ללחוץ על היעד. הכדור צריך להתחיל את השורה.':chapter===5?'המתג קבוע. הפעילו אותו בתוך המסלול והשלימו את השרשרת'+(d.switch.hold?' לפני שהשער נסגר.':'.'):kind==='portal'?'שני המעברים מחוברים ללוח. צריך להגיע לכניסה ולשמור תנופה ביציאה.':count>1?'השלימו את כל התחנות לפי הסדר. כל מסילה מכוונת את הפגיעה הבאה.':'חלקים מחוברים ללוח. מצאו את הכיוון הנכון בתוך האילוצים.';
  const first=movable[0];
  const action=first.edit.move==='x'?'גררו את '+first.label+' ימינה או שמאלה לאורך הקו. הזווית שלה קבועה.':first.edit.move==='y'?'גררו את '+first.label+' למעלה או למטה לאורך הקו. הזווית שלה קבועה.':first.edit.move==='none'?'גררו את קצה '+first.label+' כדי לסובב סביב העוגן העגול. המיקום שלה קבוע.':'גררו את '+first.label+' בתוך המסגרת; הידית העגולה מסובבת אותה.';
  d.hint=action+' '+(movable.some(p=>p.edit.rotate&&(p.edit.move==='x'||p.edit.move==='y'))?'בחלקים עם ידית עגולה אפשר לשנות גם את הזווית. ':'')+(d.switch?.hold?'אחרי המתג נשארו '+d.switch.hold+' שניות. שמרו על מהירות.':kind==='portal'?'המעבר שומר מהירות וכיוון. בדקו גם את מסילת היציאה.':count>1?'צפו בפגיעה הראשונה, ואז כוונו את התחנה הבאה.':'שנו מעט בכל ניסיון וצפו במסלול הכדור.');
  const axisRotation=movable.some(p=>p.edit.rotate&&(p.edit.move==='x'||p.edit.move==='y'));
  d.rules=[movable.length+' חלקים לכיוון',mode==='pivot'?'סיבוב בלבד':mode==='x'?axisRotation?'תנועה אופקית + ידיות סיבוב':'תנועה אופקית בלבד':mode==='y'?axisRotation?'תנועה אנכית + ידיות סיבוב':'תנועה אנכית בלבד':mode==='mixed'?'חלקים קבועים':'אזור הצבה מוגבל',...(d.walls.length?['מעבר צר']:[]),...(d.switch?.hold?[d.switch.hold+' שניות אחרי המתג']:[])];
  complete={definition:d,index,config:answer};
 }
 if(!complete)throw new Error('Unable to author stage '+(index+1)+' '+kind+' '+mode);
 authored.push(complete.definition);fixtures.push({index,config:complete.config});console.log('Authored',index+1,complete.definition.name,complete.definition.route.join(' → '));
}
fs.writeFileSync('level-data.js','// Authored offline; stable level definitions, never randomized at runtime.\nexport const puzzles='+JSON.stringify(authored,null,2)+';\n');
fs.writeFileSync('tests/solutions.json',JSON.stringify(fixtures,null,2));
