import GameFrame from '../../modules/core/GameFrame.js';

class StaticRenderer {
  private needRender: boolean;

  private frame: GameFrame;

  constructor(frame: GameFrame) {
    this.frame = frame;
    this.needRender = false;
  }


  /** 静态动画循环 */
  private render(): void {
    const container = this.frame.renderer.domElement;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const needResize = container.width !== width || container.height !== height;
    if (needResize) {
      this.frame.renderer.setSize(width, height, false);
      this.frame.camera.aspect = width / height; // 每帧更新相机宽高比
      this.frame.camera.updateProjectionMatrix();
    }

    this.needRender = false;
    this.frame.controls.update(); // 开启阻尼惯性时需调用
    this.frame.renderer.render(this.frame.scene, this.frame.camera);
  };

  /** 静态渲染入口点函数 */
  requestRender(): void {
    if (!this.needRender) {
      this.needRender = true;
      requestAnimationFrame(() => this.render());
    }
  }
}

export default StaticRenderer;
