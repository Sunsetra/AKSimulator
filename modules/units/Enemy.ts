/**
 * 敌方单位类
 * @author: 落日羽音
 */

import { Mesh } from '../../node_modules/three/build/three.module.js';
import { EnemyData } from '../core/MapInfo.js';
import Unit from '../core/Unit.js';


/**
 * 敌方单位类，描述所有敌方单位的属性。派生自Unit类。
 */
class Enemy extends Unit {
  readonly moveSpd: number; // 移动速度

  readonly rangeRad: number; // 攻击范围半径

  readonly massLv: number; // 单位重量等级

  constructor(mesh: Mesh, sizeAlpha: number, data: EnemyData) {
    super(mesh, sizeAlpha, data);

    this.moveSpd = data.moveSpd;
    this.rangeRad = data.rangeRad;
    this.massLv = data.massLv;
  }
}


export default Enemy;
