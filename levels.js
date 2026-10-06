import {puzzles} from './level-data.js';
export const chapters=[{name:'כיוון ועוגנים',mechanic:'מסילות',color:'#ee735c'},{name:'להעביר כוח',mechanic:'דומינו',color:'#39787c'},{name:'גובה ותנופה',mechanic:'קפיצים',color:'#c99452'},{name:'לחזור ולפגוע',mechanic:'פגושים',color:'#818b60'},{name:'מסלולים מקופלים',mechanic:'מעברים',color:'#8c7caa'},{name:'סדר ותזמון',mechanic:'מתגים',color:'#477f97'}];
export const solutions=[];
export function buildLevels(){return structuredClone(puzzles);}
