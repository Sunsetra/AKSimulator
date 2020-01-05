import GameMap from '../../modules/core/GameMap.js';
import {
  Fragment,
  WaveInfo,
} from '../../modules/core/MapInfo';
import Unit from '../../modules/core/Unit.js';
import Enemies from '../../modules/enemies/EnemyClassList.js';
import { ResourcesList } from '../../modules/loaders/ResourceLoader';
import { Vector2 } from '../../node_modules/three/src/math/Vector2.js';
import { Scene } from '../../node_modules/three/src/scenes/Scene.js';
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

  constructor(map: GameMap, scene: Scene, resList: ResourcesList, timeAxisUI: TimeAxisUICtl) {
    this.map = map;
    this.scene = scene;
    this.resList = resList;
    this.timeAxisUI = timeAxisUI;
    this.enemyCount = map.data.enemyNum;
    this.waves = JSON.parse(JSON.stringify(map.data.waves));

    this.activeEnemy = new Set();
    this.enemyId = 0;
  }

  updateEnemyStatus(axisTime: [string, number]): void {
    if (this.waves.length) {
      const { fragments } = this.waves[0]; // 当前波次的敌人列表
      const thisFrag = fragments[0];
      const { time, name, path } = thisFrag; // 首只敌人信息

      if (axisTime[1] >= time) { // 检查应出现的新敌人
        const enemy = this.createEnemy(name, thisFrag);
        if (enemy !== null) {
          const { x, z } = path[0] as { x: number; z: number }; // 首个路径点不可能是暂停
          const thisBlock = this.map.getBlock(z, x);
          if (thisBlock !== null && thisBlock.size !== undefined) {
            const y = thisBlock.size.y + enemy.height / 2;
            enemy.setY(y);
            enemy.position = new Vector2(x, z); // 敌人初始放置
          }

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

  private createEnemy(name: string, enemyFrag: Fragment): Unit | null {
    const mesh = this.resList.enemy[name].entity; // 读取敌人实例
    if (mesh === undefined) { return null; } // TODO: 异常处理

    const enemy = new Enemies[name](mesh);
    Object.defineProperties(enemyFrag, {
      id: { value: this.enemyId, enumerable: true },
      inst: { value: enemy, enumerable: true },
    }); // 定义敌人分片中需要的属性
    this.enemyId += 1;

    this.activeEnemy.add(enemyFrag); // 新增活跃敌人
    this.scene.add(enemy.mesh); // 添加敌人到地图
    return enemy;
  }

  /**
   * 将指定的单位实例放置至指定地点（二维）
   * @param unitInst: 需放置的单位实例
   * @param row: 放置到的行
   * @param column: 放置到的列
   */
  private placeEnemy(unitInst: Unit, row: number, column: number): void {
    const thisBlock = this.map.getBlock(row, column);
    if (thisBlock !== null && thisBlock.size !== undefined) {
      unitInst.position = new Vector2(row, column); // 敌人初始定位（抽象）
    }
  }
}


export default GameController;
