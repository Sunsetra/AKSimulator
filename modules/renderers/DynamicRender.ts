/**
 * 动态渲染器，用于游戏中连续渲染要求
 * @author: 落日羽音
 */

import { TimeAxisUI } from '../../test/UIController';
import GameFrame from '../core/GameFrame.js';
import TimeAxis from '../core/TimeAxis.js';
import Render from './Render.js';


class DynamicRenderer extends Render {
  lastTime: number; // 上次进行渲染的rAF时刻

  private readonly timeAxis: TimeAxis; // 时间轴对象

  private readonly timeAxisUI: TimeAxisUI; // 时间轴UI对象

  private readonly callback: Function; // 每帧需运行的回调函数

  private rAF: number | null; // 动态渲染标志

  constructor(frame: GameFrame, timeAxis: TimeAxis, timeAxisUI: TimeAxisUI, callback: Function) {
    super(frame);
    this.timeAxis = timeAxis;
    this.timeAxisUI = timeAxisUI;
    this.callback = callback;
    this.lastTime = 0;
    this.rAF = null;
  }

  requestRender(): void {
    this.timeAxis.start();
    this.lastTime = window.performance.now(); // 设置首帧时间
    this.rAF = requestAnimationFrame((time) => this.render(time));
  }

  pauseRender(): void {
    this.timeAxis.stop();
    if (this.rAF !== null) { cancelAnimationFrame(this.rAF); }
  }

  continueRender(): void {
    this.timeAxis.continue();
    this.lastTime = window.performance.now(); // 设置首帧时间
    this.rAF = requestAnimationFrame((time) => this.render(time));
  }

  resetRender(): void {
    this.pauseRender();
    this.timeAxisUI.clearNodes();
    this.timeAxisUI.resetTimer();
  }

  private render(rAFTime: number): void {
    this.callback(); // 运行回调，TODO 注意工厂函数（将字符串时间包装后传入与在该类中调用的区别）
    this.lastTime = rAFTime;
    this.timeAxisUI.setTimer(this.timeAxis.getElapsedTimeS()); // 更新计时器

    this.checkResize();
    this.frame.controls.update();
    this.frame.renderer.render(this.frame.scene, this.frame.camera);
    if (this.rAF) { // 从动画回调内部取消动画
      this.rAF = requestAnimationFrame((time) => this.render(time));
    }
  }
}


export default DynamicRenderer;
