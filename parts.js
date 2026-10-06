export const springsOf=w=>w.springs||(w.spring?[w.spring]:[]);
export const switchesOf=w=>w.switches||(w.switch?[w.switch]:[]);
export function portalPairsOf(w){const portals=w.portals||[],pairs=[];for(let i=0;i+1<portals.length;i+=2)pairs.push({id:portals[i].pairId||(i===0?'portal':'portal'+(i/2+1)),entrance:portals[i],exit:portals[i+1]});return pairs;}
