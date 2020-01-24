/**
 * 游戏控制类
 * @author: 落日羽音
 */

import GameMap from '../../modules/core/GameMap.js';
import {
  Fragment,
  ResourcesList,
  WaveInfo,
} from '../../modules/core/MapInfo';
import Unit from '../../modules/core/Unit.js';
import Enemies from '../../modules/enemies/EnemyList.js';
import { ResourcesUnavailableError } from '../../modules/others/exceptions.js';
import { disposeResources } from '../../modules/others/utils.js';

import {
  Scene,
  Vector2,
} from '../../node_modules/three/build/three.module.js';
import TimeAxisUICtl from './TimeAxisUICtl';


class GameController {
  enemyCount: number; // 敌人总数量

  waves: WaveInfo[]; // 波次信息

  activeEnemy: Set<Fragment>; // 在场存活敌人集合

  private readonly scene: Scene;

  private readonly map: GameMap;

  private readonly resList: ResourcesList;

  private enemyId: number; // 已出场敌人唯一ID

  private timeAxisUI: TimeAxisUICtl; // 时间轴UI控制器

  constructor(scene: Scene, map: GameMap, resList: ResourcesList, timeAxisUI: TimeAxisUICtl) {
    this.scene = scene;
    this.map = map;
    this.resList = resList;
    this.timeAxisUI = timeAxisUI;
    this.enemyCount = map.data.enemyNum;
    this.waves = JSON.parse(JSON.stringify(map.data.waves));

    this.activeEnemy = new Set();
    this.enemyId = 0;
  }

  /**
   * 管理及更新敌人状态，包括创建敌人实例/时间轴节点/管理波次数据
   * @param axisTime: 时间轴当前时间元组
   */
  updateEnemyStatus(axisTime: [string, number]): void {
    if (this.waves.length) {
      const { fragments } = this.waves[0]; // 当前波次的敌人列表
      const thisFrag = fragments[0];
      const { time, name, path } = thisFrag; // 首只敌人信息

      if (Math.abs(axisTime[1] - time) <= 0.01 || axisTime[1] > time) { // 检查应出现的新敌人；防止resize事件影响敌人创建
        const enemy = this.createEnemy(name, thisFrag);
        const { x, z } = path[0] as { x: number; z: number }; // 首个路径点不可能是暂停
        this.map.addUnit(x, z, enemy);

        const nodeType = 'enemy create';
        const nodeId = `${name}-${thisFrag.id}`;
        const resUrl = this.resList.enemy[name].url;
        this.timeAxisUI.createAxisNode(nodeType, nodeId, resUrl, axisTime);

        path.shift(); // 删除首个路径点
        fragments.shift(); // 从当前波次中删除该敌人
        if (!fragments.length) { this.waves.shift(); } // 若当前波次中剩余敌人为0则删除当前波次
      }
    }
  }

  /**
   * 更新维护所有在场敌人的位置变化
   * @param interval: 本帧与前帧的时间间隔
   * @param currentTime: 时间轴当前时间元组
   */
  updateEnemyPosition(interval: number, currentTime: [string, number]): void {
    this.activeEnemy.forEach((frag) => {
      const { path, name, inst } = frag;
      if (inst !== undefined) {
        if (path.length) { // 判定敌人是否到达终点
          if ('pause' in path[0]) { // 当前节点是暂停节点时
            if (typeof frag.pause === 'undefined') { // 当前敌人分片中没有暂停节点（新进入暂停）
              frag.pause = path[0].pause - interval; // 减去本帧已暂停时长（渲染均位于帧回调之后）
            } else {
              frag.pause -= interval; // 更新敌人分片中的暂停时间计时
              if (frag.pause <= 0) { // 取消停顿，从下一帧恢复移动
                path.shift();
                delete frag.pause;
              }
            }
          } else {
            const oldX = inst.position.x;
            const oldZ = inst.position.y;
            const newX = path[0].x + 0.5;
            const newZ = path[0].z + 0.5;

            let velocityX = inst.speed / Math.sqrt(((newZ - oldZ) / (newX - oldX)) ** 2 + 1);
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
            if (ifDeltaX && ifDeltaZ) { path.shift(); } // 判定是否到达当前路径点，到达则移除当前路径点
          }
        } else {
          this.scene.remove(inst.mesh);
          disposeResources(inst.mesh); // 释放掉敌人实体

          const nodeType = 'enemy drop';
          const nodeId = `${name}-${frag.id}`;
          const resUrl = this.resList.enemy[name].url;
          this.timeAxisUI.createAxisNode(nodeType, nodeId, resUrl, currentTime);

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
        this.activeEnemy.delete(enemy);
      }
    });
    this.enemyCount = this.map.data.enemyNum;
    this.waves = JSON.parse(JSON.stringify(this.map.data.waves));
  }

  private createEnemy(name: string, enemyFrag: Fragment): Unit {
    const mesh = this.resList.enemy[name].entity; // 读取敌人实例
    if (mesh === undefined) {
      throw new ResourcesUnavailableError(`未找到${name}单位实例`, this.resList.enemy[name]);
    }

    const enemy = new Enemies[name](mesh.clone());
    Object.defineProperties(enemyFrag, {
      id: { value: this.enemyId, enumerable: true },
      inst: { value: enemy, enumerable: true },
    }); // 定义敌人分片中需要的属性
    this.enemyId += 1;

    this.activeEnemy.add(enemyFrag); // 新增活跃敌人
    this.scene.add(enemy.mesh); // 添加敌人到地图
    return enemy;
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
