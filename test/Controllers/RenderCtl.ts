/**
 * 渲染控制类
 * @author: 落日羽音
 */

import GameFrame from '../../modules/core/GameFrame';
import DynamicRenderer from '../../modules/renderers/DynamicRender';
import StaticRenderer from '../../modules/renderers/StaticRenderer';


/* eslint-disable @typescript-eslint/no-explicit-any */
interface Callback {
  start?: (arg0?: any, ...args: any[]) => void;
  pause?: (arg0?: any, ...args: any[]) => void;
  continue?: (arg0?: any, ...args: any[]) => void;
  stop?: (arg0?: any, ...args: any[]) => void;
  reset?: (arg0?: any, ...args: any[]) => void;
}


/* eslint-enable @typescript-eslint/no-explicit-any */

class RenderController {
  callbacks?: Callback; // 每个控制状态中可指定一个回调函数

  private readonly startBtn: HTMLElement;

  private readonly resetBtn: HTMLElement;

  private readonly frame: GameFrame; // 地图框架类

  private readonly dRenderer: DynamicRenderer; // 动态渲染类

  private readonly sRenderer: StaticRenderer; // 静态渲染类

  private readonly staticRender: OmitThisParameter<() => void>; // 静态渲染函数

  constructor(frame: GameFrame, sRenderer: StaticRenderer, dRenderer: DynamicRenderer, callbacks?: Callback) {
    this.startBtn = document.querySelector('#starter') as HTMLElement;
    this.resetBtn = document.querySelector('#reset') as HTMLElement;
    this.resetBtn.addEventListener('click', this.reset);

    this.frame = frame;
    this.callbacks = callbacks;
    this.sRenderer = sRenderer;
    this.dRenderer = dRenderer;
    this.staticRender = this.sRenderer.requestRender.bind(this.sRenderer);
  }

  /**
   * 开始动态渲染动画后的状态
   */
  start: () => void = () => {
    this.startBtn.textContent = '⏸';
    this.startBtn.removeEventListener('click', this.start);
    this.startBtn.addEventListener('click', this.pause);
    this.frame.controls.removeEventListener('change', this.staticRender);
    window.removeEventListener('resize', this.staticRender);

    if (this.callbacks !== undefined && this.callbacks.start !== undefined) { this.callbacks.start(); }
    this.dRenderer.requestRender();
  };

  /**
   * 暂停动态动画渲染的状态（切换为静态渲染）
   */
  pause: () => void = () => {
    this.dRenderer.stopRender();
    if (this.callbacks !== undefined && this.callbacks.pause !== undefined) { this.callbacks.pause(); }

    this.startBtn.textContent = '▶';
    this.startBtn.addEventListener('click', this.continue);
    this.startBtn.removeEventListener('click', this.pause);
    this.frame.controls.addEventListener('change', this.staticRender);
    window.addEventListener('resize', this.staticRender);
  };

  /**
   * 继续渲染已暂停动画的状态
   */
  continue: () => void = () => {
    this.startBtn.textContent = '⏸';
    this.startBtn.removeEventListener('click', this.continue);
    this.startBtn.addEventListener('click', this.pause);
    this.frame.controls.removeEventListener('change', this.staticRender);
    window.removeEventListener('resize', this.staticRender);

    if (this.callbacks !== undefined && this.callbacks.continue !== undefined) { this.callbacks.continue(); }
    this.dRenderer.requestRender();
  };

  /**
   * 停止动画渲染的状态（需要重置战场）
   */
  stop: () => void = () => {
    this.dRenderer.stopRender();
    if (this.callbacks !== undefined && this.callbacks.stop !== undefined) { this.callbacks.stop(); }

    this.startBtn.textContent = '▶';
    this.startBtn.removeEventListener('click', this.pause);
    this.frame.controls.addEventListener('change', this.staticRender);
    window.addEventListener('resize', this.staticRender);
  };

  /**
   * 重置地图和动画后的状态（等待动画开始）
   */
  reset: () => void = () => {
    this.dRenderer.stopRender();
    if (this.callbacks !== undefined && this.callbacks.reset !== undefined) { this.callbacks.reset(); }

    this.startBtn.textContent = '▶';
    this.startBtn.removeEventListener('click', this.pause);
    this.startBtn.removeEventListener('click', this.continue);
    this.startBtn.addEventListener('click', this.start);
    this.frame.controls.addEventListener('change', this.staticRender);
    window.addEventListener('resize', this.staticRender);

    this.sRenderer.requestRender();
  };
}


export default RenderController;
