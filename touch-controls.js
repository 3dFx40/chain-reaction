// Handle intentional touchscreen taps on pointerup. Some WebViews suppress the
// compatibility click after a canvas drag; trusted follow-up clicks are deduped.
export function enableTouchButtons(root=document){
 let press=null,lastTap=-Infinity;
 root.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch'||!e.isPrimary)return;
  const button=e.target.closest('button');
  press=button&&!button.disabled?{button,id:e.pointerId,x:e.clientX,y:e.clientY}:null;
 },true);
 root.addEventListener('pointermove',e=>{
  if(press&&e.pointerId===press.id&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>8)press=null;
 },true);
 root.addEventListener('pointercancel',e=>{if(press?.id===e.pointerId)press=null;},true);
 root.addEventListener('pointerup',e=>{
  const tap=press;if(!tap||tap.id!==e.pointerId)return;press=null;
  if(e.target.closest('button')!==tap.button||tap.button.disabled)return;
  e.preventDefault();lastTap=performance.now();tap.button.click();
 },true);
 root.addEventListener('click',e=>{
  if(e.isTrusted&&performance.now()-lastTap<700&&(e.pointerType==='touch'||e.sourceCapabilities?.firesTouchEvents)){
   e.preventDefault();e.stopImmediatePropagation();
  }
 },true);
}
