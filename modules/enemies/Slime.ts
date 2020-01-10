/**
 * 源石虫类
 * @author: 落日羽音
 */

import { Mesh } from '../../node_modules/three/build/three.module.js';
import Enemy from './Enemy.js';


class Slime extends Enemy {
  constructor(mesh: Mesh) {
    super(mesh, 0.7, 550, 0.5);
  }
}


export default Slime;
