/**
 * 敌方单位抽象类
 * @author: 落日羽音
 */

import { Mesh } from '../../node_modules/three/build/three.module.js';
import Unit from '../core/Unit.js';


abstract class Enemy extends Unit {
  speed: number;

  protected constructor(mesh: Mesh, sizeAlpha: number, hp: number, speed: number) {
    super(mesh, sizeAlpha, hp);
    this.speed = speed;
  }
}


export default Enemy;
