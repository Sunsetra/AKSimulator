/**
 * 指示器类，用于追踪光标的世界坐标。
 * @author: 落日羽音
 */

import {
  Mesh,
  Raycaster,
  Vector2,
} from '../../node_modules/three/build/three.module.js';

import GameFrame from './GameFrame.js';


class Tracker {
  pickPos: Vector2 | null; // 光标在目标对象上的世界坐标（不含Y）

  lastPos: Vector2 | null; // 上次追踪的光标抽象坐标（标准化）

  private readonly rayCaster: Raycaster;

  private readonly mesh: Mesh;

  private readonly frame: GameFrame;

  private status: boolean; // 光标位置追踪运行状态

  constructor(frame: GameFrame, map: Mesh) {
    this.frame = frame;
    this.mesh = map;
    this.rayCaster = new Raycaster();
    this.pickPos = null;
    this.lastPos = null;
    this.status = false;
  }

  /** 返回当前追踪运行状态 */
  get enabled(): boolean { return this.status; }

  /** 启动光标位置追踪 */
  enable(): void {
    this.frame.addEventListener(this.frame.canvas, 'mousemove', this.getNormalizedPosition);
    this.frame.addEventListener(this.frame.canvas, 'mouseout', this.clearPickedPosition);
    this.status = true;
  }

  /** 关闭光标位置追踪 */
  disable(): void {
    this.frame.removeEventListener(this.frame.canvas, 'mousemove', this.getNormalizedPosition);
    this.frame.removeEventListener(this.frame.canvas, 'mouseout', this.clearPickedPosition);
    this.status = false;
    this.pickPos = null;
    this.lastPos = null;
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
    const intersectObj = this.rayCaster.intersectObject(this.mesh);
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
