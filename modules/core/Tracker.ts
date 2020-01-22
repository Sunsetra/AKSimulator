/**
 * 指示器类，用于追踪光标的世界坐标及生成地面指示器。
 */

import {
  Raycaster,
  Vector2,
} from '../../node_modules/three/build/three.module.js';

import { Overlay } from '../others/constants.js';
import { realPosToAbsPos } from '../others/utils.js';
import GameFrame from './GameFrame.js';
import GameMap from './GameMap.js';


class Tracker {
  pickPos: Vector2 | null; // 光标在目标对象上的世界坐标（不含Y）

  private lastPos: Vector2; // 上次获取的抽象坐标（标准化）

  private readonly rayCaster: Raycaster;

  private readonly map: GameMap;

  private readonly frame: GameFrame;

  constructor(frame: GameFrame, map: GameMap) {
    this.frame = frame;
    this.map = map;
    this.rayCaster = new Raycaster();
    this.pickPos = null;
    this.lastPos = new Vector2(-100000, -100000);
  }

  /**
   * 光标位置追踪控制开关
   * @param state: 开启/关闭状态
   */
  private set enable(state: boolean) {
    if (state) {
      this.frame.addEventListener(this.frame.canvas, 'mousemove', this.getNormalizedPosition);
      this.frame.addEventListener(this.frame.canvas, 'mouseout', this.clearPickedPosition);
    } else {
      this.frame.removeEventListener(this.frame.canvas, 'mousemove', this.getNormalizedPosition);
      this.frame.removeEventListener(this.frame.canvas, 'mouseout', this.clearPickedPosition);
    }
  }

  /**
   * 显示指定范围内的叠加层
   * @param layer: 叠加层层次
   * @param area: 相对于中心坐标的范围数组，如[[1, 0]]表示中心坐标正右侧一格
   */
  showOverlay(layer: Overlay, area: [number, number][]): void {
    this.enable = true;
    if (this.pickPos === null) {
      this.hideOverlay(layer);
    } else {
      const absPos = realPosToAbsPos(this.pickPos, true); // 转换世界坐标为抽象坐标
      if (absPos.x !== this.lastPos.x || absPos.y !== this.lastPos.y) {
        this.hideOverlay(layer);
        area.forEach((point) => {
          const row = absPos.y + point[1];
          const column = absPos.x + point[0];
          this.map.setOverlayVisibility(layer, true, row, column);
        });
        this.lastPos = absPos;
      }
    }
  }

  /**
   * 隐藏指定叠加层
   * @param layer: 叠加层层次
   */
  hideOverlay(layer: Overlay): void {
    this.map.getBlocks().forEach((block) => {
      if (block !== null) { this.map.setOverlayVisibility(layer, false, block); }
    });
  }

  /**
   * 在光标移动时获取并计算光标的标准位置，更新成员pickPos。应与光标移动事件绑定。
   * @param event: 鼠标移动事件
   */
  private getNormalizedPosition = (event: MouseEvent): void => {
    const rect = this.frame.canvas.getBoundingClientRect();
    const pos = new Vector2(event.clientX - rect.left, event.clientY - rect.top);
    const normalizedPos = new Vector2(
      (pos.x / this.frame.canvas.clientWidth) * 2 - 1,
      (pos.y / this.frame.canvas.clientHeight) * -2 + 1,
    );
    this.rayCaster.setFromCamera(normalizedPos, this.frame.camera);
    const intersectObj = this.rayCaster.intersectObject(this.map.mesh);
    if (intersectObj.length === 0) {
      this.pickPos = null;
    } else {
      this.pickPos = new Vector2(intersectObj[0].point.x, intersectObj[0].point.z);
    }
  };

  /** 设置光标拾取为null */
  private clearPickedPosition = (): void => {
    this.pickPos = null;
  };
}


export default Tracker;
