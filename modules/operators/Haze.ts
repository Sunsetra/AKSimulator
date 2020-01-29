/**
 * 干员：夜烟
 * @author: 落日羽音
 */

import { Mesh } from '../../node_modules/three/build/three.module.js';
import { sizeAlpha } from '../others/constants.js';
import Operator from './Operator.js';


class Haze extends Operator {
  constructor(mesh: Mesh, hp: number) {
    super(mesh, sizeAlpha, hp);
  }
}


export default Haze;
