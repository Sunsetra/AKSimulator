/**
 * 基本士兵类
 * @author: 落日羽音
 */

import { Mesh } from '../../node_modules/three/src/objects/Mesh.js';
import Enemy from './Enemy.js';


class Saber extends Enemy {
  constructor(mesh: Mesh) {
    super(mesh, 0.7, 0.55, 1650);
  }
}


export default Saber;
