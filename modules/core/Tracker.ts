/**
 * 指示器类，用于追踪光标的世界坐标。
 * @author: 落日羽音
 */

import {
  Mesh,
  Raycaster,
  Vector2,
} from '../../node_modules/three/build/three.module.js';
import { addEvListener } from '../others/utils.js';

import GameFrame from './GameFrame.js';


/**
 * 追踪器类，用于追踪光标所在位置。
 * 可追踪光标在canvas元素或目标对象上的位置。
 */
class Tracker {
  pointerPos: Vector2 | null; // 光标在画布上的位置

  pickPos: Vector2 | null; // 光标在目标对象上的世界坐标（不含Y）

  lastPos: Vector2 | null; // 上次追踪的光标抽象坐标（标准化）

  private readonly rayCaster: Raycaster;

  private readonly mesh: Mesh;

  private readonly frame: GameFrame;

  constructor(frame: GameFrame, map: Mesh) {
    this.frame = frame;
    this.mesh = map;
    this.rayCaster = new Raycaster();
    this.pointerPos = null;
    this.pickPos = null;
    this.lastPos = null;
    addEvListener(this.frame.canvas, 'mousemove', this.getNormalizedPosition);
    addEvListener(this.frame.canvas, 'mousedown', this.getNormalizedPosition);
    // addEvListener(this.frame.canvas, 'mouseout', this.clearPickedPosition);
  }

  /**
   * 在光标移动时获取并计算光标的标准位置，更新成员pickPos。应与光标移动事件绑定。
   * @param event: 光标移动事件
   */
  private getNormalizedPosition = (event: MouseEvent): void => {
    const rect = this.frame.canvas.getBoundingClientRect();
    this.pointerPos = new Vector2(event.clientX - rect.left, event.clientY - rect.top);
    const normalizedPos = new Vector2(
      (this.pointerPos.x / this.frame.canvas.clientWidth) * 2 - 1,
      (this.pointerPos.y / this.frame.canvas.clientHeight) * -2 + 1,
    );
    this.rayCaster.setFromCamera(normalizedPos, this.frame.camera);
    const intersectObj = this.rayCaster.intersectObject(this.mesh);
    if (intersectObj.length === 0) {
      this.pickPos = null;
    } else {
      this.pickPos = new Vector2(intersectObj[0].point.x, intersectObj[0].point.z);
    }
  };

  /** 设置光标拾取为null。注意当叠加层显示时也算光标离开画布 */
  // private clearPickedPosition = (): void => {
  //   this.pointerPos = null;
  //   this.pickPos = null;
  //   this.lastPos = null;
  // };
}


export default Tracker;
