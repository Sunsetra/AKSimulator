/**
 * 渲染器抽象基类
 * @author: 落日羽音
 */

import GameFrame from '../core/GameFrame.js';


abstract class Render {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback?: ((arg0?: any, ...args: any[]) => void) | undefined;

  protected readonly frame: GameFrame;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected constructor(frame: GameFrame, callback?: (arg0?: any, ...args: any[]) => void) {
    this.frame = frame;
    this.callback = callback;
  }

  requestRender(): void {
    requestAnimationFrame((time) => this.render(time));
  }

  protected render(rAFTime: number): void {
    if (this.callback) { this.callback(rAFTime); }
    this.checkResize();
    this.frame.renderer.render(this.frame.scene, this.frame.camera);
  }

  protected checkResize(): void {
    const width = this.frame.canvas.clientWidth;
    const height = this.frame.canvas.clientHeight;
    const needResize = this.frame.canvas.width !== width * 2 || this.frame.canvas.height !== height * 2;
    if (needResize) {
      this.frame.renderer.setSize(width, height, false);
      this.frame.camera.aspect = width / height; // 每帧更新相机宽高比
      this.frame.camera.updateProjectionMatrix();
    }
  }
}


export default Render;
