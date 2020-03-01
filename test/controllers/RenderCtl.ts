/**
 * 渲染控制类
 * @author: 落日羽音
 */

import GameFrame from '../../modules/core/GameFrame';
import DynamicRenderer from '../../modules/renderers/DynamicRender';
import StaticRenderer from '../../modules/renderers/StaticRenderer';


interface Callback {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  start?: (...args: any[]) => void;
  pause?: (...args: any[]) => void;
  continue?: (...args: any[]) => void;
  stop?: (...args: any[]) => void;
  reset?: (...args: any[]) => void;
  /* eslint-enable @typescript-eslint/no-explicit-any */
}


class RenderController {
  callbacks?: Callback; // 每个控制状态中可指定一个回调函数

  lastTime: number; // 上次进行渲染时的rAF时刻

  private readonly startBtn: HTMLButtonElement;

  private readonly resetBtn: HTMLButtonElement;

  private readonly frame: GameFrame; // 地图框架类

  private readonly dRenderer: DynamicRenderer; // 动态渲染类

  private readonly sRenderer: StaticRenderer; // 静态渲染类

  private readonly staticRender: OmitThisParameter<() => void>; // 静态渲染函数

  constructor(frame: GameFrame, sRenderer: StaticRenderer, dRenderer: DynamicRenderer, callbacks?: Callback) {
    this.frame = frame;
    this.callbacks = callbacks;
    this.lastTime = dRenderer.lastTime;
    this.sRenderer = sRenderer;
    this.dRenderer = dRenderer;
    this.staticRender = this.sRenderer.requestRender.bind(this.sRenderer);

    this.startBtn = document.querySelector('#starter') as HTMLButtonElement;
    this.resetBtn = document.querySelector('#reset') as HTMLButtonElement;
  }

  /**
   * 开始动态渲染动画后的状态
   */
  start: () => void = () => {
    this.startBtn.textContent = '⏸';
    this.frame.removeEventListener(this.startBtn, 'click', this.start);
    this.frame.addEventListener(this.startBtn, 'click', this.pause);
    this.frame.removeEventListener(this.frame.controls, 'change', this.staticRender);

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
    this.frame.addEventListener(this.startBtn, 'click', this.continue);
    this.frame.removeEventListener(this.startBtn, 'click', this.pause);
    this.frame.addEventListener(this.frame.controls, 'change', this.staticRender);
  };

  /**
   * 继续渲染已暂停动画的状态
   */
  continue: () => void = () => {
    this.startBtn.textContent = '⏸';
    this.frame.removeEventListener(this.startBtn, 'click', this.continue);
    this.frame.addEventListener(this.startBtn, 'click', this.pause);
    this.frame.removeEventListener(this.frame.controls, 'change', this.staticRender);

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
    this.startBtn.disabled = true;
    this.frame.removeEventListener(this.startBtn, 'click', this.pause);
    this.frame.addEventListener(this.frame.controls, 'change', this.staticRender);
  };

  /**
   * 重置地图和动画后的状态（等待动画开始）
   */
  reset: () => void = () => {
    this.dRenderer.stopRender();
    if (this.callbacks !== undefined && this.callbacks.reset !== undefined) { this.callbacks.reset(); }

    this.startBtn.textContent = '▶';
    this.startBtn.disabled = false;
    this.frame.removeEventListener(this.startBtn, 'click', this.pause);
    this.frame.removeEventListener(this.startBtn, 'click', this.continue);
    this.frame.addEventListener(this.startBtn, 'click', this.start);
    this.frame.addEventListener(this.resetBtn, 'click', this.reset);
    this.frame.addEventListener(this.frame.controls, 'change', this.staticRender);

    this.sRenderer.requestRender();
  };
}


export default RenderController;
