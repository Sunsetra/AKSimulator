/**
 * 光标追踪类，用于追踪光标在地面上的世界坐标
 */

import {
  Mesh,
  Raycaster,
  Vector2,
  Vector3,
} from '../../node_modules/three/build/three.module.js';
import GameFrame from './GameFrame.js';


class Picker {
  pickPos: Vector2;

  private rayCaster: Raycaster;

  private readonly ground: Mesh;

  private readonly frame: GameFrame;

  constructor(frame: GameFrame, ground: Mesh) {
    this.frame = frame;
    this.ground = ground;
    this.rayCaster = new Raycaster();
    this.pickPos = new Vector2();
    this.frame.addEventListener(window, 'mousemove', this.getNormalizedPosition);
    this.frame.addEventListener(window, 'mouseout', this.clearPickedPosition);
    this.frame.addEventListener(window, 'mouseleave', this.clearPickedPosition);
  }

  pick(): Vector3 | null {
    this.rayCaster.setFromCamera(this.pickPos, this.frame.camera);
    const intersectObj = this.rayCaster.intersectObject(this.ground);
    return intersectObj.length ? intersectObj[0].point : null;
  }

  /**
   * 在光标移动时获取并计算光标的标准位置，更新成员pickPos。应与光标移动事件绑定。
   * @param event: 鼠标移动事件
   */
  private getNormalizedPosition = (event: MouseEvent): void => {
    const rect = this.frame.canvas.getBoundingClientRect();
    const pos = new Vector2(event.clientX - rect.left, event.clientY - rect.top);
    this.pickPos.x = (pos.x / this.frame.canvas.clientWidth) * 2 - 1;
    this.pickPos.y = (pos.y / this.frame.canvas.clientHeight) * -2 + 1;
  };

  /** 清除标准光标位置到屏幕外的位置 */
  private clearPickedPosition = (): void => {
    this.pickPos.x = -1000000;
    this.pickPos.y = -1000000;
  };
}


export default Picker;
