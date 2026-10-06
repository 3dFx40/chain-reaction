const KEY='chain-players-v1';
export function normalizeName(value){
 const name=String(value).normalize('NFC').trim().replace(/\s+/gu,' ');
 if(!/^[\p{L}\p{N} _.-]{2,20}$/u.test(name))throw new Error('בחרו שם באורך 2–20 תווים: אותיות, מספרים, רווחים, נקודה, מקף או קו תחתון.');
 return name;
}
export function compareScores(a,b){return a.attempts-b.attempts||a.time-b.time;}
export function createPlayerStore(storage){
 let state={active:null,players:[]};
 try{const saved=JSON.parse(storage.getItem(KEY)||'null');if(saved&&Array.isArray(saved.players)){state=saved;state.players=state.players.filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&Array.isArray(p.completed)&&p.records&&typeof p.records==='object');if(!state.players.some(p=>p.id===state.active))state.active=null;}}catch{}
 const persist=()=>storage.setItem(KEY,JSON.stringify(state));
 const active=()=>state.players.find(p=>p.id===state.active)||null;
 return {
  active,players:()=>state.players,
  add(name,legacy){
   name=normalizeName(name);
   if(state.players.some(p=>p.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw new Error('השם הזה כבר קיים במכשיר. בחרו אותו ברשימה או בחרו שם אחר.');
   const previous=JSON.stringify(state),first=state.players.length===0;
   const player={id:crypto.randomUUID(),name,completed:first?legacy.completed:[],current:first?legacy.current:null,records:{}};
   state.players.push(player);state.active=player.id;
   try{persist();}catch{state=JSON.parse(previous);throw new Error('לא ניתן לשמור במכשיר. בדקו שהדפדפן מאפשר אחסון מקומי.');}
   return player;
  },
  select(id){if(id!==null&&!state.players.some(p=>p.id===id))return false;const previous=state.active;state.active=id;try{persist();}catch{state.active=previous;throw new Error('לא ניתן לשמור את בחירת השחקן במכשיר.');}return true;},
  progress(levels,fallback){const p=active();return p?{done:levels.flatMap((l,i)=>p.completed.includes(l.id)?[i]:[]),current:Math.max(0,levels.findIndex(l=>l.id===p.current))}:fallback;},
  save(levels,done,current){const p=active();if(!p)return;p.completed=[...new Set(done)].map(i=>levels[i]?.id).filter(Boolean);p.current=levels[current].id;persist();},
  record(levelId,attempts,time){const p=active();if(!p||!Number.isInteger(attempts)||attempts<1||!Number.isFinite(time)||time<=0)return false;const score={attempts,time:Math.round(time*1000)/1000},old=p.records[levelId];if(old&&compareScores(score,old)>=0)return false;p.records[levelId]=score;try{persist();}catch(error){if(old)p.records[levelId]=old;else delete p.records[levelId];throw error;}return true;},
  leaderboard(levels,levelId=null){
   const ids=new Set(levels.map(l=>l.id));
   return state.players.flatMap(p=>{
    const records=Object.entries(p.records).filter(([id,r])=>ids.has(id)&&r&&Number.isInteger(r.attempts)&&r.attempts>0&&Number.isFinite(r.time)&&r.time>0);
    if(levelId){const score=records.find(([id])=>id===levelId)?.[1];return score?[{id:p.id,name:p.name,...score}]:[];}
    const completed=new Set(p.completed.filter(id=>ids.has(id))).size;
    return completed?[{id:p.id,name:p.name,completed,measured:records.length,attempts:records.reduce((s,[,r])=>s+r.attempts,0),time:records.reduce((s,[,r])=>s+r.time,0)}]:[];
   }).sort((a,b)=>levelId?compareScores(a,b):b.completed-a.completed||b.measured-a.measured||compareScores(a,b));
  }
 };
}
