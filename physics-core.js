export const W=700,H=630;
export function createFromDefinition(definition,index=0){const l=structuredClone(definition);return {...l,index,spawn:{...l.ball},rails:l.rails||[],ball:{...l.ball,vx:0,vy:0,r:13},dominoes:(l.dominoes||[]).map(d=>({...d,angle:0,omega:0,hit:false})),mode:'edit',time:0,stallTime:0,contacts:0,trail:[],events:[],visited:[],routeIndex:0,failure:'',springCooldown:0,portalCooldown:0,bumperCooldown:0,switchOn:false,switchTime:null,particles:[]};}
export function resetWorld(w){Object.assign(w.ball,w.spawn,{vx:0,vy:0});w.mode='edit';w.time=0;w.stallTime=0;w.contacts=0;w.trail=[];w.events=[];w.visited=[];w.routeIndex=0;w.failure='';w.springCooldown=0;w.portalCooldown=0;w.bumperCooldown=0;w.switchOn=false;w.switchTime=null;w.dominoes.forEach(d=>Object.assign(d,{angle:0,omega:0,hit:false}));w.particles=[];}
export function startWorld(w){resetWorld(w);w.mode='running';}
export function gateOpen(w){return !w.switch||(w.switchOn&&(!w.switch.hold||w.time-w.switchTime<w.switch.hold));}
export function routeComplete(w){return w.routeIndex===(w.route||[]).length;}
function fail(w,reason){if(w.mode!=='running')return;w.failure=reason;w.mode='failed';w.events.push({type:'failed'});}
function visit(w,id){if(w.visited.includes(id))return;w.visited.push(id);if(!(w.route||[]).includes(id))return;if(w.route[w.routeIndex]!==id){fail(w,'החלקים הופעלו בסדר הלא נכון. התחילו לפי סדר השרשרת.');return;}w.routeIndex++;w.events.push({type:'checkpoint',id});}
function finish(w){if(w.mode!=='running'||!routeComplete(w)||!gateOpen(w))return;w.mode='won';w.events.push({type:'won'});}
function segment(w,x1,y1,x2,y2,bounce=.07,thickness=7){const b=w.ball,dx=x2-x1,dy=y2-y1,t=Math.max(0,Math.min(1,((b.x-x1)*dx+(b.y-y1)*dy)/(dx*dx+dy*dy))),cx=x1+t*dx,cy=y1+t*dy,ex=b.x-cx,ey=b.y-cy,dist=Math.hypot(ex,ey),radius=b.r+thickness;if(dist>=radius||dist<.0001)return false;const nx=ex/dist,ny=ey/dist,vn=b.vx*nx+b.vy*ny;b.x=cx+nx*radius;b.y=cy+ny*radius;if(vn<0){b.vx-=(1+bounce)*vn*nx;b.vy-=(1+bounce)*vn*ny;if(vn<-65){w.contacts++;w.events.push({type:'hit',energy:-vn,x:cx,y:cy});}}return true;}
function rectContact(w,r){const b=w.ball,cx=Math.max(r.x,Math.min(r.x+r.w,b.x)),cy=Math.max(r.y,Math.min(r.y+r.h,b.y));return Math.hypot(b.x-cx,b.y-cy)<b.r;}
function wall(w,r){const b=w.ball,cx=Math.max(r.x,Math.min(r.x+r.w,b.x)),cy=Math.max(r.y,Math.min(r.y+r.h,b.y)),dx=b.x-cx,dy=b.y-cy,d=Math.hypot(dx,dy);if(d>=b.r)return;if(d<.00001){const distances=[b.x-r.x,r.x+r.w-b.x,b.y-r.y,r.y+r.h-b.y],side=distances.indexOf(Math.min(...distances));if(side===0){b.x=r.x-b.r;b.vx=-Math.abs(b.vx)*.25;}if(side===1){b.x=r.x+r.w+b.r;b.vx=Math.abs(b.vx)*.25;}if(side===2){b.y=r.y-b.r;b.vy=-Math.abs(b.vy)*.25;}if(side===3){b.y=r.y+r.h+b.r;b.vy=Math.abs(b.vy)*.25;}return;}const nx=dx/d,ny=dy/d,v=b.vx*nx+b.vy*ny;b.x=cx+nx*b.r;b.y=cy+ny*b.r;if(v<0){b.vx-=1.2*v*nx;b.vy-=1.2*v*ny;}}
export function stepWorld(w,dt){
 if(w.mode!=='running')return;
 w.time+=dt;w.springCooldown=Math.max(0,w.springCooldown-dt);w.portalCooldown=Math.max(0,w.portalCooldown-dt);w.bumperCooldown=Math.max(0,w.bumperCooldown-dt);
 const b=w.ball;b.vy+=620*dt;b.vx*=Math.exp(-.045*dt);b.x+=b.vx*dt;b.y+=b.vy*dt;
 for(const h of w.hazards||[])if(rectContact(w,h)){fail(w,'הכדור נפל למלכודת. צריך למצוא דרך מעליה.');return;}
 for(const r of w.walls||[])wall(w,r);
 if(w.switch&&!w.switchOn&&Math.hypot(b.x-w.switch.x,b.y-w.switch.y)<29){w.switchOn=true;w.switchTime=w.time;w.contacts++;visit(w,'switch');w.events.push({type:'switch',x:w.switch.x,y:w.switch.y});}
 if(w.switchOn&&w.switch?.hold&&!gateOpen(w)){fail(w,'הזמן נגמר והשער נסגר. שמרו יותר תנופה אחרי המתג.');return;}
 if(w.gate&&!gateOpen(w))segment(w,w.gate.x-w.gate.len/2,w.gate.y,w.gate.x+w.gate.len/2,w.gate.y,.4);
 if(w.portals&&w.portalCooldown===0&&Math.hypot(b.x-w.portals[0].x,b.y-w.portals[0].y)<28){b.x=w.portals[1].x;b.y=w.portals[1].y+36;w.portalCooldown=.5;w.trail=[];w.contacts++;visit(w,'portal');w.events.push({type:'portal',x:b.x,y:b.y});}
 if(w.bumpers&&w.bumperCooldown===0)for(const s of w.bumpers){if(Math.hypot(b.x-s.x,b.y-s.y)<b.r+s.r){const power=s.power||470;b.vx=Math.cos(s.a)*power;b.vy=Math.sin(s.a)*power;b.x=s.x+Math.cos(s.a)*(s.r+16);b.y=s.y+Math.sin(s.a)*(s.r+16);w.bumperCooldown=.2;w.contacts++;visit(w,s.id);w.events.push({type:'bumper',x:s.x,y:s.y});}}
 for(const r of w.rails){const dx=Math.cos(r.a)*r.len/2,dy=Math.sin(r.a)*r.len/2;if(segment(w,r.x-dx,r.y-dy,r.x+dx,r.y+dy))visit(w,r.id);}
 if(w.spring&&w.springCooldown===0){const s=w.spring;if(Math.hypot(b.x-s.x,b.y-s.y)<b.r+28){const power=s.power||520;b.vx=Math.cos(s.a)*power;b.vy=Math.sin(s.a)*power;b.x=s.x+Math.cos(s.a)*45;b.y=s.y+Math.sin(s.a)*45;w.springCooldown=.3;w.contacts++;visit(w,s.id);w.events.push({type:'spring',x:s.x,y:s.y});}}
 for(let i=0;i<w.dominoes.length;i++){
  const d=w.dominoes[i],dir=d.dir||1,height=d.height||80;
  if(!d.hit&&Math.abs(b.x-d.x)<b.r+11&&b.y>d.y-height-3&&b.y<d.y+7&&Math.hypot(b.vx,b.vy)>60){d.hit=true;d.omega=2.2;w.contacts++;if(i===0)visit(w,'domino');w.events.push({type:'domino',x:d.x,y:d.y});b.vx*=.55;b.vy*=.75;}
  if(!d.hit)continue;
  d.omega+=Math.sin(Math.max(.08,d.angle))*13*dt;d.angle=Math.min(1.49,d.angle+d.omega*dt);
  const next=w.dominoes[i+1];if(next&&!next.hit&&(d.x+dir*Math.sin(d.angle)*height-next.x)*dir>=-10){next.hit=true;next.omega=d.omega*.75;w.contacts++;w.events.push({type:'domino',x:next.x,y:next.y});}
  if(i===w.dominoes.length-1&&Math.hypot(d.x+dir*Math.sin(d.angle)*height-w.goal.x,d.y-Math.cos(d.angle)*height-w.goal.y)<(w.goal.r||23)+14)finish(w);
 }
 if(w.mode!=='running')return;
 w.stallTime=w.time>1&&Math.hypot(b.vx,b.vy)<18?w.stallTime+dt:0;
 if(w.stallTime>.9&&!w.dominoes.some(d=>d.hit&&d.angle<1.48)){fail(w,'הכדור איבד תנופה. נסו שיפוע או זווית אחרים.');return;}
 if(Math.hypot(b.x-w.goal.x,b.y-w.goal.y)<b.r+(w.goal.r||23)){if(!routeComplete(w)){fail(w,'הגעתם ליעד בלי להשלים את השרשרת המסומנת.');return;}if(w.goal.onlyDomino){fail(w,'הדומינו האחרון צריך ללחוץ על היעד. הכדור לא מספיק.');return;}finish(w);}
 if(w.mode==='running'&&(b.y>H+65||b.x<-70||b.x>W+70||w.time>(w.timeLimit||8))){const moving=w.dominoes.some(d=>d.hit&&d.angle<1.48);if(!moving)fail(w,'הכדור יצא מהמסלול. תקנו את הכיוון ונסו שוב.');}
 if(w.trail.length===0||Math.hypot(b.x-w.trail.at(-1).x,b.y-w.trail.at(-1).y)>9){w.trail.push({x:b.x,y:b.y});if(w.trail.length>90)w.trail.shift();}
}
