/**
 * 干员类
 * @author: 落日羽音
 */

import { Mesh } from '../../node_modules/three/build/three.module.js';
import { OperatorData } from '../core/MapInfo.js';
import Unit from '../core/Unit.js';
import { sizeAlpha } from '../others/constants.js';


/**
 * 干员类，描述所有干员的属性，派生自Unit类。
 */
class Operator extends Unit {
  readonly prof: string; // 干员职业

  readonly posType: string; // 干员可放置砖块类别，见BlockType常量

  readonly cost: number; // 干员cost

  readonly block: number; // 阻挡数

  readonly respawnTime: number; // 再部署时间

  readonly spRecoveryPerSec: number; // 每秒自回技力

  readonly maxDeployCount: number; // 最大布署数量

  readonly tauntLevel: number; // 嘲讽等级

  readonly atkArea: [number, number][]; // 攻击范围

  constructor(mesh: Mesh, data: OperatorData) {
    super(mesh, sizeAlpha, data);

    this.prof = data.prof;
    this.posType = data.posType;
    this.cost = data.cost;
    this.block = data.block;
    this.respawnTime = data.respawnTime;
    this.spRecoveryPerSec = data.spRecoveryPerSec;
    this.maxDeployCount = data.maxDeployCount;
    this.tauntLevel = data.tauntLevel;
    this.atkArea = data.atkArea;
  }
}


export default Operator;
