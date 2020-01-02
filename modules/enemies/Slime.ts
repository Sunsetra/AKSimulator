/**
 * 源石虫类
 * @author: 落日羽音
 */

import { Mesh } from '../../node_modules/three/src/objects/Mesh.js';
import Enemy from './Enemy.js';


class Slime extends Enemy {
  constructor(mesh: Mesh) {
    super(mesh, 0.7, 0.5, 550);
  }
}


export default Slime;
