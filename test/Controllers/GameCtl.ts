/**
 * 游戏控制类
 * @author: 落日羽音
 */

import GameMap from '../../modules/core/GameMap.js';
import {
  Data,
  EnemyData,
  EnemyWrapper,
  Fragment,
  OperatorData,
  WaveInfo,
} from '../../modules/core/MapInfo';
import { ResourcesUnavailableError } from '../../modules/others/exceptions.js';
import { disposeResources } from '../../modules/others/utils.js';
import Enemy from '../../modules/units/Enemy.js';
import Operator from '../../modules/units/Operator.js';

import {
  Scene,
  Vector2,
} from '../../node_modules/three/build/three.module.js';
import TimeAxisUICtl from './TimeAxisUICtl.js';


/**
 * 游戏控制类，用于管理游戏进行中敌人/干员单位的状态、位置等信息。
 */
class GameController {
  enemyCount: number; // 敌人总数量

  waves: WaveInfo[]; // 波次信息

  activeEnemy: Set<EnemyWrapper>; // 在场存活敌人集合

  activeOperator: Map<string, Operator>; // 在场上的干员映射

  private readonly scene: Scene;

  private readonly map: GameMap;

  private enemyId: number; // 已出场敌人唯一ID

  private readonly data: Data;

  constructor(scene: Scene, map: GameMap, data: Data) {
    this.scene = scene;
    this.map = map;
    this.data = data;
    this.enemyCount = map.data.enemyNum;
    this.waves = JSON.parse(JSON.stringify(map.data.waves));

    this.activeEnemy = new Set();
    this.activeOperator = new Map<string, Operator>();
    this.enemyId = 0;
  }

  /**
   * 管理及更新敌人状态，包括创建敌人实例/时间轴节点/管理波次数据
   * @param timeAxisUI: 时间轴控制器
   * @param axisTime: 时间轴当前时间元组
   */
  updateEnemyStatus(timeAxisUI: TimeAxisUICtl, axisTime: [string, number]): void {
    if (this.waves.length) {
      const { fragments } = this.waves[0]; // 当前波次的敌人列表
      const thisFrag = fragments[0];
      const { time, name, route } = thisFrag; // 首只敌人信息

      if (Math.abs(axisTime[1] - time) <= 0.01 || axisTime[1] > time) { // 检查应出现的新敌人；防止resize事件影响敌人创建
        const enemyData = this.data.units.enemy[name];
        const enemy = this.createEnemy(name, thisFrag, enemyData); // 生成的敌人对象不可能为null
        const { x, z } = route[0] as { x: number; z: number }; // 首个路径点不可能是暂停
        this.map.addUnit(x, z, enemy);

        const nodeType = 'enemy create';
        const nodeId = `${name}-${thisFrag.id}`;
        timeAxisUI.createAxisNode(nodeType, nodeId, name, axisTime);

        route.shift(); // 删除首个路径点
        fragments.shift(); // 从当前波次中删除该敌人
        if (!fragments.length) { this.waves.shift(); } // 若当前波次中剩余敌人为0则删除当前波次
      }
    }
  }

  /**
   * 更新维护所有在场敌人的位置变化
   * @param timeAxisUI: 时间轴控制器
   * @param interval: 本帧与前帧的时间间隔
   * @param currentTime: 时间轴当前时间元组
   */
  updateEnemyPosition(timeAxisUI: TimeAxisUICtl, interval: number, currentTime: [string, number]): void {
    this.activeEnemy.forEach((frag) => {
      const { route, name, inst } = frag;
      if (inst !== undefined) {
        if (route.length) { // 判定敌人是否到达终点
          if ('pause' in route[0]) { // 当前节点是暂停节点时
            if (typeof frag.pause === 'undefined') { // 当前敌人分片中没有暂停节点（新进入暂停）
              frag.pause = route[0].pause - interval; // 减去本帧已暂停时长（渲染均位于帧回调之后）
            } else {
              frag.pause -= interval; // 更新敌人分片中的暂停时间计时
              if (frag.pause <= 0) { // 取消停顿，从下一帧恢复移动
                route.shift();
                delete frag.pause;
              }
            }
          } else {
            const oldX = inst.position.x;
            const oldZ = inst.position.y;
            const newX = route[0].x + 0.5;
            const newZ = route[0].z + 0.5;

            let velocityX = inst.moveSpd / Math.sqrt(((newZ - oldZ) / (newX - oldX)) ** 2 + 1);
            velocityX = newX >= oldX ? velocityX : -velocityX;
            let velocityZ = Math.abs(((newZ - oldZ) / (newX - oldX)) * velocityX);
            velocityZ = newZ >= oldZ ? velocityZ : -velocityZ;

            const stepX = interval * velocityX + oldX;
            const stepZ = interval * velocityZ + oldZ;
            inst.position = new Vector2(stepX, stepZ);
            // this.placeEnemy(inst, stepX, stepZ);

            const rotateDeg = Math.atan((newZ - oldZ) / (newX - oldX));
            inst.mesh.rotation.y = Math.PI - rotateDeg; // 调整运动方向

            const ifDeltaX = Math.abs(newX - stepX) <= Math.abs(interval * velocityX);
            const ifDeltaZ = Math.abs(newZ - stepZ) <= Math.abs(interval * velocityZ);
            if (ifDeltaX && ifDeltaZ) { route.shift(); } // 判定是否到达当前路径点，到达则移除当前路径点
          }
        } else {
          this.scene.remove(inst.mesh);
          disposeResources(inst.mesh); // 释放掉敌人实体

          const nodeType = 'enemy drop';
          const nodeId = `${name}-${frag.id}`;
          timeAxisUI.createAxisNode(nodeType, nodeId, name, currentTime);

          this.activeEnemy.delete(frag);
          this.enemyCount -= 1;
        }
      }
    });
  }

  /**
   * 重置游戏：清空场上所有敌人并重置计数变量
   */
  resetGame(): void {
    this.activeEnemy.forEach((enemy) => {
      if (enemy.inst !== undefined) {
        this.scene.remove(enemy.inst.mesh);
        disposeResources(enemy.inst.mesh); // 释放掉敌人实体
        this.activeEnemy.delete(enemy);
      }
    });
    this.enemyCount = this.map.data.enemyNum;
    this.waves = JSON.parse(JSON.stringify(this.map.data.waves));
  }


  /**
   * 创建敌人实例，并返回创建的实例
   * @param name: 敌方单位名称
   * @param frag: 敌方单位行动片段信息
   * @param data: 创建实例时所需的数据类
   */
  createEnemy(name: string, frag: Fragment, data: EnemyData): Enemy {
    const { entity } = this.data.materials.resources.enemy[name]; // 读取敌人实体
    if (entity === undefined) {
      throw new ResourcesUnavailableError(`未找到${name}单位实体:`, this.data.materials.resources.enemy[name]);
    }
    const enemy = new Enemy(entity.clone(), data);

    /* 以敌人分段信息为基础，完善单位总信息对象EnemyWrapper */
    const wrapper: EnemyWrapper = Object.defineProperties(frag, {
      id: { value: this.enemyId, enumerable: true },
      inst: { value: enemy, enumerable: true },
    });
    this.enemyId += 1;
    this.activeEnemy.add(wrapper); // 新增活跃敌人，数据类型为Fragment
    return enemy;
  }

  /**
   * 创建干员实例，若成功返回创建的实例，若失败（超过上场数量限制）返回null
   * @param name: 干员名称
   * @param data: 创建实例时所需的单位源数据OperatorData
   */
  createOperator(name: string, data: OperatorData): Operator | null {
    const { entity } = this.data.materials.resources.operator[name]; // 读取敌人实体
    if (entity === undefined) {
      throw new ResourcesUnavailableError(`未找到${name}单位实体:`, this.data.materials.resources.operator[name]);
    }

    if (this.activeOperator.get(name) === undefined) {
      const opr = new Operator(entity, data); // 不需要克隆实体，干员在场只有一名
      this.activeOperator.set(name, opr);
      return opr;
    }
    return null;
  }

  // /** TODO: 单位自动寻路
  //  * 将指定的单位实例放置至指定地点（二维）
  //  * @param unitInst: 需放置的单位实例
  //  * @param row: 放置到的行
  //  * @param column: 放置到的列
  //  */
  // private placeEnemy(unitInst: Unit, row: number, column: number): void {
  //   const thisBlock = this.map.getBlock(row, column);
  //   if (thisBlock !== null && thisBlock.size !== undefined) {
  //     unitInst.position = absPosToRealPos(new Vector2(row, column));
  //   }
  // }
}


export default GameController;
