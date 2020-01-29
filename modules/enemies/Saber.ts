/**
 * 基本士兵类
 * @author: 落日羽音
 */

import { Mesh } from '../../node_modules/three/build/three.module.js';
import { sizeAlpha } from '../others/constants.js';
import Enemy from './Enemy.js';


class Saber extends Enemy {
  constructor(mesh: Mesh) {
    super(mesh, sizeAlpha, 1650, 0.55);
  }
}


export default Saber;
