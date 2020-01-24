/**
 * 干员：夜烟
 * @author: 落日羽音
 */

import { Mesh } from '../../node_modules/three/build/three.module.js';
import Operator from './Operator.js';


class Haze extends Operator {
  constructor(mesh: Mesh) {
    super(mesh, 0.7, 1420);
  }
}


export default Haze;
