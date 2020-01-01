/**
 * 渲染器抽象基类
 * @author: 落日羽音
 */

import GameFrame from '../core/GameFrame.js';


abstract class Render {
  protected readonly frame: GameFrame;

  protected constructor(frame: GameFrame) {
    this.frame = frame;
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
