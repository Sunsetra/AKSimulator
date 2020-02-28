/**
 * 渲染器抽象基类
 * @author: 落日羽音
 */

import GameFrame from '../core/GameFrame.js';


abstract class Render {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback?: ((arg0?: any, ...args: any[]) => void) | undefined;

  protected readonly frame: GameFrame;

  protected readonly devicePixelRatio: number; // 设备像素比

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected constructor(frame: GameFrame, callback?: (arg0?: any, ...args: any[]) => void) {
    this.frame = frame;
    this.callback = callback;
    this.devicePixelRatio = this.frame.renderer.getPixelRatio();
  }

  requestRender(): void {
    requestAnimationFrame((time) => this.render(time));
  }

  checkResize(): void {
    const width = this.frame.canvas.clientWidth;
    const height = this.frame.canvas.clientHeight;
    const needResize = this.frame.canvas.width !== width * this.devicePixelRatio
      || this.frame.canvas.height !== height * this.devicePixelRatio;
    if (needResize) {
      this.frame.renderer.setSize(width, height, false);
      this.frame.camera.aspect = width / height; // 每帧更新相机宽高比
      this.frame.camera.updateProjectionMatrix();

      this.frame.renderer.render(this.frame.scene, this.frame.camera);
    }
  }

  protected render(rAFTime: number): void {
    if (this.callback) { this.callback(rAFTime); }
    this.frame.renderer.render(this.frame.scene, this.frame.camera);
  }
}


export default Render;
