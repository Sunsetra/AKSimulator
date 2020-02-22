/**
 * 干员类
 * @author: 落日羽音
 */

import {
  Mesh,
  Vector2,
} from '../../node_modules/three/build/three.module.js';
import {
  OperatorData,
  TrackData,
} from '../core/MapInfo.js';
import Unit from '../core/Unit.js';


/**
 * 干员类，描述所有干员的属性，派生自Unit类。
 */
class Operator extends Unit {
  readonly prof: string; // 干员职业

  readonly posType: string; // 干员可放置砖块类别，见BlockType常量

  readonly block: number; // 阻挡数

  readonly spRecoveryPerSec: number; // 每秒自回技力

  readonly tauntLevel: number; // 嘲讽等级

  cost: number; // 干员cost（随撤退次数改变）

  rspTime: number; // 再部署冷却时间

  atkArea: Vector2[]; // 攻击范围，可在选择干员朝向时设置

  trackData: TrackData; // 追踪统计数据

  constructor(mesh: Mesh, sizeAlpha: number, data: OperatorData) {
    super(mesh, sizeAlpha, data);

    this.prof = data.prof;
    this.posType = data.posType;
    this.cost = data.cost;
    this.block = data.block;
    this.rspTime = 0;
    this.spRecoveryPerSec = data.spRecoveryPerSec;
    this.tauntLevel = data.tauntLevel;
    this.trackData = {
      withdrawCnt: 0,
    };

    /* 转译攻击范围为Vector2数组 */
    const atkArea: Vector2[] = [];
    data.atkArea.forEach((tuple) => {
      atkArea.push(new Vector2(tuple[0], tuple[1]));
    });
    this.atkArea = atkArea;
  }
}


export default Operator;
