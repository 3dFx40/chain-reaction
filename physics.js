import {buildLevels} from './levels.js';
import {createFromDefinition} from './physics-core.js';
export {chapters} from './levels.js';
export * from './physics-core.js';
export const levels=buildLevels();
export function createWorld(index){return createFromDefinition(levels[index],index);}
