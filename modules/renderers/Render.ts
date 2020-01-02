/**
 * 渲染器抽象基类
 * @author: 落日羽音
 */

import GameFrame from '../core/GameFrame.js';


abstract class Render {
  protected readonly frame: GameFrame;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected callback?: ((arg0?: any, ...args: any[]) => void) | undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected constructor(frame: GameFrame, callback?: (arg0?: any, ...args: any[]) => void) {
    this.frame = frame;
    this.callback = callback;
  }

  protected checkResize(): void {
    const container = this.frame.renderer.domElement;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const needResize = container.width !== width || container.height !== height;
    if (needResize) {
      this.frame.renderer.setSize(width, height, false);
      this.frame.camera.aspect = width / height; // 每帧更新相机宽高比
      this.frame.camera.updateProjectionMatrix();
    }
  }
}


export default Render;
