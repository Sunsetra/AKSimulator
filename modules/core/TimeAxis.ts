import { Clock } from '../../node_modules/three/src/core/Clock.js';


class TimeAxis extends Clock {
  /** 扩展THREE内置的Clock时间轴类，支持格式化输出经过时间及继续计时函数 */
  constructor() {
    super(false);
  }

  /**
   * 格式化输出当前时间（字符串和浮点秒）
   */
  getCurrentTime(): [string, number] {
    const elapsed = super.getElapsedTime();
    const msecs = (Math.floor((elapsed * 1000) % 1000)).toString().padStart(3, '0');
    const secs = Math.floor(elapsed % 60).toString().padStart(2, '0');
    const min = Math.floor(elapsed / 60).toString().padStart(2, '0');
    return [`${min}:${secs}.${msecs}`, elapsed];
  }

  /** 继续已暂停的计时器（对正在计时的无效） */
  continue(): void {
    if (!this.running) {
      const { elapsedTime } = this; // 计时器stop时已更新过elapsedTime
      this.start();
      this.elapsedTime = elapsedTime;
    }
  }
}


export default TimeAxis;
