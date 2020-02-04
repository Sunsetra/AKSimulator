/**
 * 时间轴UI控制器
 * @author: 落日羽音
 */
import { ResourcesList } from '../../modules/core/MapInfo';


class TimeAxisUICtl {
  private readonly timeAxis: HTMLElement;

  private readonly timer: HTMLElement;

  private readonly resList: ResourcesList;

  /** 时间轴UI控制 */
  constructor(resList: ResourcesList) {
    this.resList = resList;
    this.timeAxis = document.querySelector('#axis') as HTMLElement;
    this.timer = document.querySelector('#timer') as HTMLElement; // 计时器
  }

  /**
   * 创建显示在时间轴上的单位节点
   * @param prop - 单位节点视觉行为，由单位类型与单位行为组成：
   *  类型：（标记）橙色表示敌方单位(enemy)，蓝色表示干员(operator)
   *  行为：（图标）正常色表示创建(create)，灰度表示死亡(dead)，漏怪(drop)以红色标记表示
   * @param id - 单位名称：用于节点类名
   * @param name - 单位名称
   * @param currentTime - 当前时间元组
   * @returns - 返回时间轴节点
   */
  createAxisNode(prop: string, id: string, name: string, currentTime: [string, number]): HTMLDivElement {
    const type = prop.split(' ')[0]; // 制作的节点类型
    const { url } = this.resList[type][name]; // 资源URL
    const [nodeTime, createTime] = currentTime;

    const node = document.createElement('div'); // 创建容器节点
    node.dataset.createTime = createTime.toFixed(4); // 在节点的数据属性中记录出现时间
    node.setAttribute('class', `mark-icon ${id}`);

    node.addEventListener('mouseover', () => {
      const nodes = this.timeAxis.querySelectorAll(`.${id}`);
      nodes.forEach((item: Element) => {
        const icon: HTMLElement | null = item.querySelector('.icon');
        const detail: HTMLElement | null = item.querySelector('.detail');
        const arrow: HTMLElement | null = item.querySelector('.detail-arrow');

        if (icon && detail && arrow) {
          if (window.getComputedStyle(icon).filter === 'none') { // 在原样式基础上增加光标高亮行为
            icon.style.filter = 'brightness(200%)';
          } else {
            icon.style.filter = `${window.getComputedStyle(icon).filter} brightness(2)`;
          }
          icon.style.zIndex = '999';

          detail.style.display = 'block';

          arrow.style.display = 'block';
        }
      });
    });

    node.addEventListener('mouseout', () => {
      const nodes = this.timeAxis.querySelectorAll(`.${id}`);
      nodes.forEach((item: Element) => {
        const icon: HTMLElement | null = item.querySelector('.icon');
        const detail: HTMLElement | null = item.querySelector('.detail');
        const arrow: HTMLElement | null = item.querySelector('.detail-arrow');

        if (icon && detail && arrow) {
          icon.style.filter = '';
          icon.style.zIndex = '';

          detail.style.display = 'none';

          arrow.style.display = 'none';
        }
      });
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
    this.timeAxis.appendChild(node);
    return node;
  }

  /** 清除时间轴上的所有节点 */
  clearNodes(): void {
    while (this.timeAxis.firstChild) { // 清除时间轴的子节点
      this.timeAxis.removeChild(this.timeAxis.firstChild);
    }
  }

  /**
   * 更新子节点在时间轴上的位置
   * @param axisTime - 当前时刻
   */
  updateAxisNodes(axisTime: number): void {
    this.timeAxis.childNodes.forEach((child: Node) => {
      const { style, dataset } = child as HTMLElement;
      const createTime = Number(dataset.createTime);
      const pos = ((createTime / axisTime) * 100).toFixed(2);
      style.left = `${pos}%`;
    });
  }


  /**
   * 设置计时器时间
   * @param time - 新的计时器时间
   */
  setTimer(time: string): void {
    if (this.timer) { this.timer.textContent = time; }
  }

  /** 重置计时器 */
  resetTimer(): void {
    if (this.timer) { this.timer.textContent = '00:00.000'; }
  }
}


export default TimeAxisUICtl;
