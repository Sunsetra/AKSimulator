/**
 * 单位抽象类
 * @author: 落日羽音
 */

import { MeshBasicMaterial } from '../../node_modules/three/src/materials/MeshBasicMaterial.js';
import { Box3 } from '../../node_modules/three/src/math/Box3.js';
import { Vector2 } from '../../node_modules/three/src/math/Vector2.js';
import { Vector3 } from '../../node_modules/three/src/math/Vector3.js';
import { Mesh } from '../../node_modules/three/src/objects/Mesh.js';

import { BlockUnit } from '../Others/constants.js';
import {
  absPosToRealPos,
  realPosToAbsPos,
} from '../Others/utils.js';


abstract class Unit {
  mesh: Mesh; // 单位网格模型

  hp: number; // 单位血量

  readonly width: number; // 单位模型宽度

  readonly height: number; // 单位模型高度

  /**
   * 定义单位模型及相对大小
   * @param mesh - 单位网格模型
   * @param sizeAlpha - 模型大小相对于单位砖块长度的尺寸系数
   * @param hp - 单位血量
   */
  protected constructor(mesh: Mesh, sizeAlpha: number, hp: number) {
    const material = mesh.material as MeshBasicMaterial;
    const width = material.map ? material.map.image.width : 1;
    const mag = (BlockUnit * sizeAlpha) / width;
    mesh.scale.set(mag, mag, mag);
    this.mesh = mesh;

    const box = new Box3().setFromObject(mesh);
    const boxSize = box.getSize(new Vector3());
    this.width = boxSize.x;
    this.height = boxSize.y;
    this.hp = hp;
  }

  /**
   * 读取模型的抽象位置（二维）
   */
  get position(): Vector2 {
    const pos = this.mesh.getWorldPosition(new Vector3());
    return realPosToAbsPos(new Vector2(pos.x, pos.z));
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
