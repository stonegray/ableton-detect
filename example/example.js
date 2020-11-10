import path from 'path';
import os from 'os';

import getAbletons from '../src/index.js' // from '@stonegray/ableton-detect'

const ableton = await getAbletons();

console.log(ableton);

