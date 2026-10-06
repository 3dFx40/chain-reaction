const KEY='chain-campaign-v3';
export function readProgress(storage,levels){
 try{
  const saved=JSON.parse(storage.getItem(KEY)||'null');
  if(saved){const completed=Array.isArray(saved.completed)?saved.completed:[];return {done:levels.flatMap((l,i)=>completed.includes(l.id)?[i]:[]),current:Math.max(0,levels.findIndex(l=>l.id===saved.current))};}
  const old=JSON.parse(storage.getItem('chain-v2-completed')||'[]'),completed=Array.isArray(old)?old:[],current=Number(storage.getItem('chain-v2-current')||0);
  const retained=levels.map((l,i)=>({i,old:l.id?.startsWith('legacy-')?Number(l.id.slice(7))-1:-1})).filter(l=>l.old>=0);
  return {done:retained.filter(l=>completed.includes(l.old)).map(l=>l.i),current:retained.filter(l=>l.old<=current).at(-1)?.i||0};
 }catch{return {done:[],current:0};}
}
export function saveProgress(storage,levels,done,current){try{storage.setItem(KEY,JSON.stringify({completed:[...new Set(done)].map(i=>levels[i]?.id).filter(Boolean),current:levels[current].id}));}catch{}}
