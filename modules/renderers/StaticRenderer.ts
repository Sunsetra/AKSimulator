/**
 * 静态渲染器，用于静态场景
 * @author: 落日羽音
 */

import GameFrame from '../core/GameFrame.js';
import Render from './Render.js';


class StaticRenderer extends Render {
  private needRender: boolean;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(frame: GameFrame, callback?: (arg0?: any, ...args: any[]) => void) {
    super(frame, callback);
    this.needRender = false;
  }

  /** 静态渲染入口点函数 */
  requestRender(): void {
    if (!this.needRender) {
      this.needRender = true;
      requestAnimationFrame((time) => this.render(time));
    }
  }

  /** 静态动画循环 */
  protected render(rAFTime: number): void {
    // console.log('静态渲染');
    // console.log(this.frame.status.renderType);
    if (this.callback) { this.callback(rAFTime); }
    this.needRender = false;
    this.frame.controls.update(); // 开启阻尼惯性时需调用
    this.frame.renderer.render(this.frame.scene, this.frame.camera);
  }
}


export default StaticRenderer;
