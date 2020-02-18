/**
 * 时间轴UI控制器
 * @author: 落日羽音
 */

import { ResourcesList } from '../../modules/core/MapInfo.js';
import TimeAxis from '../../modules/core/TimeAxis.js';


/**
 * 时间轴UI控制器，用于操作时间轴上的节点行为，并设置计时器UI
 */
class TimeAxisUICtl {
  private readonly timeAxisNode: HTMLElement; // 时间轴元素

  private readonly timer: HTMLElement; // 计时器UI

  private readonly resList: ResourcesList; // 资源列表

  private readonly timeAxis: TimeAxis; // 时间轴对象

  /** 时间轴UI控制 */
  constructor(timeAxis: TimeAxis, resList: ResourcesList) {
    this.timeAxis = timeAxis;
    this.resList = resList;
    const axisNode = document.querySelector('.time-axis') as HTMLDivElement;
    this.timeAxisNode = axisNode.children[0] as HTMLDivElement;
    this.timer = axisNode.children[1] as HTMLDivElement; // 计时器
  }

  /**
   * 创建显示在时间轴上的单位节点
   * @param prop - 单位节点视觉行为，由单位类型与单位行为组成：
   *  类型：（标记）橙色表示敌方单位(enemy)，绿色表示干员(operator)
   *  行为：（图标）正常色表示创建(create)，蓝色表示撤离（leave），
   *               灰度表示死亡(dead)，红色表示漏怪(drop)
   * @param id - 单位名称：用于节点类名
   * @param name - 单位名称
   * @returns - 返回时间轴节点
   */
  createAxisNode(prop: string, id: string, name: string): HTMLDivElement {
    const type = prop.split(' ')[0]; // 制作的节点类型
    const { url } = this.resList[type][name]; // 资源URL
    const [nodeTime, createTime] = this.timeAxis.getCurrentTime();

    const node = document.createElement('div'); // 创建容器节点
    node.dataset.createTime = createTime.toFixed(3); // 在节点的数据属性中记录出现时间
    node.setAttribute('class', `mark-icon ${id}`);
    node.style.left = '100%';

    node.addEventListener('mouseover', () => {
      const nodes = this.timeAxisNode.querySelectorAll(`.${id}`);
      nodes.forEach((item) => {
        const icon = item.children[1] as HTMLDivElement;
        const detail = item.children[2] as HTMLDivElement;
        const arrow = item.children[3] as HTMLDivElement;

        if (icon && detail && arrow) {
          if (window.getComputedStyle(icon).filter === 'none') { // 在原样式基础上增加光标高亮行为
            icon.style.filter = 'brightness(200%)';
          } else {
            icon.style.filter = `${window.getComputedStyle(icon).filter} brightness(2)`;
          }
          icon.style.zIndex = '2';

          detail.style.display = 'block';

          arrow.style.display = 'block';
        }
      });
      node.style.zIndex = '3';
    });

    node.addEventListener('mouseout', () => {
      const nodes = this.timeAxisNode.querySelectorAll(`.${id}`);
      nodes.forEach((item) => {
        const icon = item.children[1] as HTMLDivElement;
        const detail = item.children[2] as HTMLDivElement;
        const arrow = item.children[3] as HTMLDivElement;

        if (icon && detail && arrow) {
          icon.style.filter = '';
          icon.style.zIndex = '';

          detail.style.display = 'none';

          arrow.style.display = 'none';
        }
      });
      node.style.zIndex = '';
    });

    const markNode = document.createElement('div'); // 创建时间轴标记节点
    markNode.setAttribute('class', `mark ${prop}`);

    const iconNode = document.createElement('div'); // 创建图标标记节点
    iconNode.setAttribute('class', 'icon');
    iconNode.style.backgroundImage = `url("${url}")`;

    const detailNode = document.createElement('div'); // 创建详细时间节点
    detailNode.setAttribute('class', 'detail');
    detailNode.textContent = nodeTime;

    const detailArrow = document.createElement('div'); // 创建小箭头节点
    detailArrow.setAttribute('class', 'detail-arrow');

    node.appendChild(markNode);
    node.appendChild(iconNode);
    node.appendChild(detailNode);
    node.appendChild(detailArrow);
    this.timeAxisNode.appendChild(node);
    return node;
  }

  /** 清除时间轴上的所有节点 */
  clearNodes(): void {
    while (this.timeAxisNode.firstChild) { // 清除时间轴的子节点
      this.timeAxisNode.removeChild(this.timeAxisNode.firstChild);
    }
  }

  /** 更新子节点在时间轴上的位置 */
  updateAxisNodes(): void {
    this.timeAxisNode.childNodes.forEach((child) => {
      const { style, dataset } = child as HTMLElement;
      const createTime = Number(dataset.createTime);
      const pos = ((createTime / this.timeAxis.getCurrentTime()[1]) * 100).toFixed(2);
      style.left = `${pos}%`;
    });
  }


  /** 设置计时器时间 */
  setTimer(): void {
    [this.timer.textContent] = this.timeAxis.getCurrentTime();
  }

  /** 重置计时器 */
  resetTimer(): void {
    this.timer.textContent = '00:00.000';
  }
}


export default TimeAxisUICtl;
