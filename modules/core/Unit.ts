/**
 * 单位抽象类
 * @author: 落日羽音
 */

import {
  Box3,
  Mesh,
  MeshBasicMaterial,
  Vector2,
  Vector3,
} from '../../node_modules/three/build/three.module.js';

import { BlockUnit } from '../others/constants.js';
import {
  absPosToRealPos,
  realPosToAbsPos,
} from '../others/utils.js';
import { UnitAbstractData } from './MapInfo';


/**
 * 单位抽象类，包含了所有单位（干员/敌人）应具有的属性。
 * 派生为Enemy和Operator类。
 */
abstract class Unit {
  mesh: Mesh; // 单位网格模型

  readonly name: string; // 单位名称

  readonly width: number; // 单位模型宽度

  readonly height: number; // 单位模型高度

  /* 以下属性来自数据文件 */
  readonly maxHp: number; // 最大血量

  readonly atk: number; // 攻击力

  readonly def: number; // 物理防御力

  readonly resist: number; // 法术抗性

  readonly atkTime: number; // 攻击速度（间隔？）

  readonly hpRecoveryPerSec: number; // 每秒自回血量

  readonly massLevel: number; // 重量等级

  readonly stunImmune: boolean; // 眩晕抗性

  readonly silenceImmune: boolean; // 沉默抗性

  /**
   * 定义单位模型及相对大小
   * @param mesh - 单位网格模型
   * @param sizeAlpha - 模型大小相对于单位砖块长度的尺寸系数
   * @param data - 单位抽象数据
   */
  protected constructor(mesh: Mesh, sizeAlpha: number, data: UnitAbstractData) {
    const material = mesh.material as MeshBasicMaterial;
    const width = material.map ? material.map.image.width : 1;
    const mag = (BlockUnit * sizeAlpha) / width;
    mesh.scale.set(mag, mag, mag);
    this.mesh = mesh;

    const box = new Box3().setFromObject(mesh);
    const boxSize = box.getSize(new Vector3());
    this.width = boxSize.x;
    this.height = boxSize.y;

    this.name = data.name;
    this.maxHp = data.maxHp;
    this.atk = data.atk;
    this.def = data.def;
    this.resist = data.resist;
    this.atkTime = data.atkTime;
    this.hpRecoveryPerSec = data.hpRecoveryPerSec;
    this.massLevel = data.massLevel;
    this.stunImmune = data.stunImmune;
    this.silenceImmune = data.silenceImmune;
  }

  /**
   * 读取模型的抽象位置（二维）
   */
  get position(): Vector2 {
    const pos = this.mesh.getWorldPosition(new Vector3());
    return realPosToAbsPos(pos.x, pos.z);
  }

  /**
   * 用抽象位置设置模型的世界位置（二维）
   * @param pos - 包括三向坐标的对象（Y向为undefined表示Y向坐标不变）
   */
  set position(pos: Vector2) {
    const realPos = absPosToRealPos(pos);
    this.mesh.position.setX(realPos.x);
    this.mesh.position.setZ(realPos.y);
  }

  /**
   * 设置单位实体的世界位置（Y向）
   * @param y: Y向世界坐标
   */
  setY(y: number): void {
    this.mesh.position.setY(y);
  }
}


export default Unit;
