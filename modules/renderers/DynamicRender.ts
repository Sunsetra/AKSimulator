/**
 * 动态渲染器，用于游戏中连续渲染要求
 * 注: 渲染均位于帧回调之后
 * @author: 落日羽音
 */

import GameFrame from '../core/GameFrame.js';
import Render from './Render.js';


class DynamicRenderer extends Render {
  lastTime: number; // 上次进行渲染的rAF时刻

  private rAF: number | null; // 动态渲染标志

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(frame: GameFrame, callback?: (arg0?: any, ...args: any[]) => void) {
    super(frame, callback);
    this.lastTime = 0;
    this.rAF = null;
  }

  requestRender(): void {
    this.lastTime = window.performance.now(); // 设置首帧时间
    this.rAF = requestAnimationFrame((time) => this.render(time));
  }

  stopRender(): void {
    if (this.rAF) { cancelAnimationFrame(this.rAF); }
    this.rAF = null;
  }

  protected render(rAFTime: number): void {
    // console.log('动态渲染');
    if (this.callback !== undefined) { this.callback(rAFTime); } // 运行回调
    this.lastTime = rAFTime;
    this.checkResize();
    this.frame.controls.update();
    this.frame.renderer.render(this.frame.scene, this.frame.camera);
    if (this.rAF) { // 从动画回调内部取消动画
      this.rAF = requestAnimationFrame((time) => this.render(time));
    }
  }
}


export default DynamicRenderer;
