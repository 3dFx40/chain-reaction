export function setupPlayers(store,levels,{changePlayer,legacy}){
 const $=s=>document.querySelector(s);
 const showError=error=>{$('#player-error').textContent=error.message;};
 function renderPlayers(){
  $('#player-name').textContent=store.active()?.name||'בחירת שחקן';
  const list=$('#player-list');list.replaceChildren();
  for(const player of store.players()){
   const button=document.createElement('button');button.type='button';button.className='secondary player-choice';button.textContent=player.name;
   button.setAttribute('aria-pressed',String(player.id===store.active()?.id));
   button.onclick=()=>{try{store.select(player.id);changePlayer();renderPlayers();$('#player-dialog').close();}catch(error){showError(error);}};
   list.append(button);
  }
 }
 $('#open-player').onclick=()=>{renderPlayers();$('#player-error').textContent='';$('#username').value='';$('#player-dialog').showModal();};
 $('#close-player').onclick=()=>$('#player-dialog').close();
 $('#player-form').onsubmit=e=>{e.preventDefault();try{store.add($('#username').value,legacy());changePlayer();renderPlayers();$('#player-dialog').close();}catch(error){showError(error);}};
 $('#play-guest').onclick=()=>{try{store.select(null);changePlayer();renderPlayers();$('#player-dialog').close();}catch(error){showError(error);}};
 const select=$('#score-level');
 levels.forEach((level,i)=>{const option=document.createElement('option');option.value=level.id;option.textContent=String(i+1).padStart(2,'0')+' — '+level.name;select.append(option);});
 function renderScores(){
  const levelId=select.value||null,rows=store.leaderboard(levels,levelId),body=$('#score-rows');body.replaceChildren();
  $('#score-heading').textContent=levelId?'ניסיונות':'שלבים';
  $('#score-explanation').textContent=levelId?'פחות ניסיונות מנצחים. בשוויון, זמן הכדור הקצר יותר מנצח.':'יותר שלבים הושלמו — דירוג גבוה יותר. בשוויון: יותר שיאים מדודים, פחות ניסיונות ואז זמן הכדור.';
  $('#score-empty').hidden=rows.length>0;$('#score-table').hidden=rows.length===0;
  rows.forEach((row,i)=>{const tr=document.createElement('tr');tr.classList.toggle('my-score',row.id===store.active()?.id);const values=[i+1,row.name,levelId?row.attempts:row.completed,levelId?row.time.toFixed(2)+' שנ׳':row.measured?row.attempts+' / '+row.time.toFixed(1)+' שנ׳':'—'];for(const value of values){const cell=document.createElement('td');cell.textContent=value;cell.dir='auto';tr.append(cell);}body.append(tr);});
  $('#score-time-heading').textContent=levelId?'זמן הכדור':'ניסיונות / זמן';
 }
 $('#open-scores').onclick=()=>{renderScores();$('#scores-dialog').showModal();};
 $('#close-scores').onclick=()=>$('#scores-dialog').close();select.onchange=renderScores;
 renderPlayers();
}
