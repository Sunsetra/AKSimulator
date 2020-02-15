/**
 * 游戏控制类
 * @author: 落日羽音
 */

import GameMap from '../../modules/core/GameMap.js';
import {
  ControlData,
  Data,
  EnemyData,
  EnemyWrapper,
  Fragment,
  OperatorData,
  ResourceData,
  UnitData,
  WaveInfo,
} from '../../modules/core/MapInfo.js';
import { GameStatus } from '../../modules/others/constants.js';
import {
  DataError,
  ResourcesUnavailableError,
} from '../../modules/others/exceptions.js';
import Enemy from '../../modules/units/Enemy.js';
import Operator from '../../modules/units/Operator.js';

import { Vector2 } from '../../node_modules/three/build/three.module.js';
import TimeAxisUICtl from './TimeAxisUICtl.js';


/**
 * 游戏控制类，用于管理游戏进行中敌人/干员单位的状态、位置等信息。
 */
class GameController {
  activeEnemy: Set<EnemyWrapper>; // 在场存活敌人集合

  activeOperator: Map<string, Operator>; // 在场的干员映射

  allOperator: Map<string, Operator>; // 未上场的干员映射

  cost: number; // 当前游戏cost

  readonly ctlData: ControlData; // 游戏控制源数据

  private waves: WaveInfo[]; // 波次信息

  private enemyCount: number; // 剩余敌人计数

  private enemyId: number; // 已出场敌人唯一ID

  private lifePoint: number; // 剩余生命点数

  private stat: GameStatus.Standby | GameStatus.Running; // 游戏运行状态存储

  private readonly map: GameMap;

  private readonly unitData: UnitData; // 单位名对应的单位数据

  private readonly matData: ResourceData; // 资源数据

  constructor(map: GameMap, data: Data) {
    this.map = map;
    this.ctlData = map.data.ctlData;
    this.matData = data.materials;
    this.unitData = data.units;
    this.waves = JSON.parse(JSON.stringify(map.data.waves));

    this.lifePoint = this.ctlData.maxLP;
    this.enemyCount = this.ctlData.enemyNum;
    this.cost = this.ctlData.initCost;
    this.activeEnemy = new Set();
    this.activeOperator = new Map<string, Operator>();
    this.allOperator = new Map<string, Operator>();
    this.enemyId = 0;
    this.stat = GameStatus.Standby;
  }

  /**
   * 设置游戏状态
   * @param newStatus - 新状态只能是待机或运行中
   */
  setStatus(newStatus: GameStatus.Standby | GameStatus.Running): void {
    this.stat = newStatus;
  }

  /** 每帧检查控制游戏状态 */
  getStatus(): GameStatus {
    if (this.lifePoint === 0) {
      return GameStatus.Defeat;
    }
    if (this.enemyCount === 0) {
      return GameStatus.Victory;
    }
    return this.stat;
  }

  /**
   * 更新并返回当前cost
   * @param interval - 帧时间间隔
   */
  updateCost(interval: number): number {
    if (this.cost <= this.ctlData.maxCost) {
      this.cost += this.ctlData.costInc * interval;
    }
    return this.cost;
  }

  /**
   * 管理及更新敌人状态，包括创建敌人实例/时间轴节点/管理波次数据
   * @param timeAxisUI - 时间轴控制器
   * @param axisTime - 时间轴当前时间元组
   */
  updateEnemyStatus(timeAxisUI: TimeAxisUICtl, axisTime: [string, number]): void {
    if (this.waves.length) {
      const { fragments } = this.waves[0]; // 当前波次的敌人列表
      const thisFrag = fragments[0];
      const { time, name, route } = thisFrag; // 首只敌人信息

      if (Math.abs(axisTime[1] - time) <= 0.01 || axisTime[1] > time) { // 检查应出现的新敌人；防止resize事件影响敌人创建
        const enemyData = this.unitData.enemy[name];
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
   * @param timeAxisUI - 时间轴控制器
   * @param interval - 本帧与前帧的时间间隔
   * @param currentTime - 时间轴当前时间元组
   */
  updateEnemyPosition(timeAxisUI: TimeAxisUICtl, interval: number, currentTime: [string, number]): void {
    this.activeEnemy.forEach((frag) => {
      const { route, name, inst } = frag;
      if (inst === undefined) {
        throw new DataError(`未找到${name}单位实例:`, frag);
      } else if (route.length) { // 判定敌人是否到达终点
        if ('pause' in route[0]) { // 当前节点是暂停节点时
          if (frag.pause === undefined) { // 当前敌人分片中没有暂停节点（新进入暂停）
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

          const moveSpd = inst.moveSpd * this.ctlData.moveSpdMulti;
          let velocityX = moveSpd / Math.sqrt(((newZ - oldZ) / (newX - oldX)) ** 2 + 1);
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
        this.lifePoint -= 1;
        this.map.removeUnit(inst);
        this.activeEnemy.delete(frag);
        this.enemyCount -= 1;

        const nodeType = 'enemy drop';
        const nodeId = `${name}-${frag.id}`;
        timeAxisUI.createAxisNode(nodeType, nodeId, name, currentTime);
      }
    });
  }

  /**
   * 重置游戏
   * 1. 清空场上所有敌人并重置计数变量
   * 2. 重置干员实例变量，从活跃干员转移至全干员映射
   */
  reset(): void {
    this.activeOperator.forEach((opr) => {
      this.map.removeUnit(opr); // 释放掉干员实体
      this.allOperator.set(opr.name, opr);
    });
    this.activeOperator.clear();

    this.allOperator.forEach((opr) => {
      opr.cost = this.unitData.operator[opr.name].cost;
      opr.trackData.withdrawCnt = 0;
    });
    this.activeEnemy.forEach((enemy) => {
      this.map.removeUnit(enemy.inst); // 释放掉敌人实体
      this.activeEnemy.delete(enemy);
    });
    this.enemyCount = this.ctlData.enemyNum;
    this.lifePoint = this.ctlData.maxLP;
    this.cost = this.ctlData.initCost;
    this.waves = JSON.parse(JSON.stringify(this.map.data.waves));
  }


  /**
   * 创建敌人实例，并返回创建的实例
   * @param name - 敌方单位名称
   * @param frag - 敌方单位行动片段信息
   * @param data - 创建实例时所需的数据类
   */
  createEnemy(name: string, frag: Fragment, data: EnemyData): Enemy {
    const { entity } = this.matData.resources.enemy[name]; // 读取敌人实体
    if (entity === undefined) {
      throw new ResourcesUnavailableError(`未找到${name}单位实体:`, this.matData.resources.enemy[name]);
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
   * 创建干员实例并添加至总干员映射，返回创建的实例
   * @param name - 干员名称
   * @param data - 创建实例时所需的单位源数据OperatorData
   */
  createOperator(name: string, data: OperatorData): Operator {
    const { entity } = this.matData.resources.operator[name]; // 读取敌人实体
    if (entity === undefined) {
      throw new ResourcesUnavailableError(`未找到${name}单位实体:`, this.matData.resources.operator[name]);
    }

    const opr = new Operator(entity.clone(), data); // 克隆实体，以兼容后续添加召唤物等
    this.allOperator.set(name, opr);
    return opr;
  }

  /**
   * 向控制器中添加活跃干员实例
   * @param opr - 要添加的干员实例
   * @return - 返回剩余可添加的干员数
   */
  addOperator(opr: Operator): number {
    this.cost -= opr.cost;
    const inst = this.allOperator.get(opr.name);
    if (inst !== undefined) {
      this.activeOperator.set(inst.name, inst); // 添加干员到活跃干员组
      this.allOperator.delete(opr.name);
    }
    return this.ctlData.oprLimit - this.activeOperator.size;
  }

  /**
   * 移除指定的干员实例
   * 部署费用变化：首次移除为原费用的1.5倍，第二次及以上为2倍
   * 返还费用变化：每次均为本次部署费用/2
   * 计算后均向下取整
   * @param opr - 要移除的干员名称
   * @return - 返回剩余可添加的干员数
   */
  removeOperator(opr: string): number {
    const oprInst = this.activeOperator.get(opr);
    if (oprInst !== undefined) {
      const { cost } = this.unitData.operator[opr]; // 原始cost
      this.cost += Math.floor(oprInst.cost / 2);
      if (oprInst.trackData.withdrawCnt === 0) { // 首次撤退
        oprInst.cost = Math.floor(cost * 1.5); // 新费用为原费用的1.5倍
      } else if (oprInst.trackData.withdrawCnt === 1) { // 第二次撤退
        oprInst.cost = cost * 2; // 新费用为原费用的2倍
      }
      oprInst.trackData.withdrawCnt += 1;
      this.activeOperator.delete(opr);
      this.allOperator.set(opr, oprInst);
    }
    return this.ctlData.oprLimit - this.activeOperator.size;
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
