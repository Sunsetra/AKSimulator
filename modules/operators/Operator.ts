/**
 * 干员抽象类
 * @author: 落日羽音
 */

import { Mesh } from '../../node_modules/three/build/three.module.js';
import Unit from '../core/Unit.js';


abstract class Operator extends Unit {
  protected constructor(mesh: Mesh, sizeAlpha: number, hp: number) {
    super(mesh, sizeAlpha, hp);
  }
}


export default Operator;
