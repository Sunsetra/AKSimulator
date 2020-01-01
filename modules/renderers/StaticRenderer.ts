/**
 * 静态渲染器，用于静态场景
 * @author: 落日羽音
 */

import GameFrame from '../core/GameFrame.js';
import Render from './Render.js';


class StaticRenderer extends Render {
  private needRender: boolean;

  constructor(frame: GameFrame) {
    super(frame);
    this.needRender = false;
  }

  /** 静态渲染入口点函数 */
  requestRender(): void {
    if (!this.needRender) {
      this.needRender = true;
      requestAnimationFrame(() => this.render());
    }
  }

  /** 静态动画循环 */
  private render(): void {
    this.checkResize();
    this.needRender = false;
    this.frame.controls.update(); // 开启阻尼惯性时需调用
    this.frame.renderer.render(this.frame.scene, this.frame.camera);
  }
}


export default StaticRenderer;
