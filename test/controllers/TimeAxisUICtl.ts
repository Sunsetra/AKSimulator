/**
 * 时间轴UI控制器
 * @author: 落日羽音
 */

import { ResourcesList } from '../../modules/core/MapInfo.js';
import TimeAxis from '../../modules/core/TimeAxis.js';
import { addEvListener } from '../../modules/others/utils.js';


/* 时间轴上的节点对象 */
interface UnitNode {
  name: string; // 单位名称
  color: string; // 单位节点配色
  ctTime: number; // 节点创建时间
  url: string; // 图标资源地址
}


/* 单位节点配色 */
interface UnitColor {
  create: string;
  leave: string;
  dead: string;

  [type: string]: string;
}


/**
 * 时间轴UI控制器，用于操作时间轴上的节点行为，并设置计时器UI
 */
class TimeAxisUICtl {
  private nodes: Set<UnitNode>; // 节点对象组，遍历读取重绘

  private readonly cvsNode: HTMLCanvasElement; // 时间轴画布

  private readonly ctx: CanvasRenderingContext2D; // 画布上下文

  private readonly resList: ResourcesList; // 资源列表

  private readonly timeAxis: TimeAxis; // 时间轴对象

  private readonly unitColor: { [type: string]: UnitColor }; // 单位配色常量定义

  /** 时间轴UI控制 */
  constructor(timeAxis: TimeAxis, resList: ResourcesList) {
    this.timeAxis = timeAxis;
    this.resList = resList;
    this.unitColor = {
      operator: {
        create: 'LimeGreen',
        leave: 'dodgerblue',
        dead: 'gray',
      },
      enemy: {
        create: 'orange',
        leave: 'red',
        dead: 'gray',
      },
    };
    this.nodes = new Set<UnitNode>();

    this.cvsNode = document.querySelector('.time-axis canvas') as HTMLCanvasElement;
    this.ctx = this.cvsNode.getContext('2d') as CanvasRenderingContext2D;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    /* 关联resize事件，resize后重新计算画布的宽度，同时更新size属性 */
    addEvListener(window, 'resize', () => {
      const { width, height } = this.cvsNode.getBoundingClientRect();
      this.cvsNode.width = width * window.devicePixelRatio;
      this.cvsNode.height = height * window.devicePixelRatio;
      this.ctx.fillStyle = 'white';
      this.ctx.font = `${this.cvsNode.height / 3}px sans-serif`;
      this.update();
    });
  }

  /**
   * 创建并添加节点对象
   * @param name - 节点对象名称
   * @param type - 节点类型：干员operator，敌人enemy
   * @param action - 节点行为：create创建，leave撤退/漏怪，dead死亡
   */
  addNode(name: string, type: string, action: string): void {
    this.nodes.add({
      name,
      color: this.unitColor[type][action],
      ctTime: this.timeAxis.getCurrentTime()[1],
      url: this.resList[type][name].url,
    });
  }

  /** 重置计时器并移除所有节点对象 */
  reset(): void {
    this.nodes.clear();
    this.timeAxis.reset();
    this.update();
  }

  /** 更新并重绘时间轴画布 */
  update(): void {
    const { width, height } = this.cvsNode;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillRect(0, height / 3, width * 0.85, height / 3);
    this.ctx.fill();

    this.ctx.fillText(this.timeAxis.getCurrentTime()[0], width * 0.87, height / 1.6, width * 0.12);
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
  // createAxisNode(prop: string, id: string, name: string): HTMLDivElement {
  //   const type = prop.split(' ')[0]; // 制作的节点类型
  //   const { url } = this.resList[type][name]; // 资源URL
  //   const [nodeTime, createTime] = this.timeAxis.getCurrentTime();
  //
  //   const node = document.createElement('div'); // 创建容器节点
  //   node.dataset.createTime = createTime.toFixed(3); // 在节点的数据属性中记录出现时间
  //   node.setAttribute('class', `mark-icon ${id}`);
  //   if (createTime) { node.style.left = '100%'; }
  //
  //   node.addEventListener('mouseover', () => {
  //     const nodes = this.timeAxisNode.querySelectorAll(`.${id}`);
  //     nodes.forEach((item) => {
  //       const icon = item.children[1] as HTMLDivElement;
  //       const detail = item.children[2] as HTMLDivElement;
  //       const arrow = item.children[3] as HTMLDivElement;
  //
  //       if (icon && detail && arrow) {
  //         const { filter } = window.getComputedStyle(icon);
  //         icon.style.filter = filter === 'none' ? 'brightness(2)' : `${filter} brightness(2)`; // 在原样式基础上增加光标高亮行为
  //         icon.style.zIndex = '2';
  //
  //         detail.style.display = 'block';
  //
  //         arrow.style.display = 'block';
  //       }
  //     });
  //     node.style.zIndex = '3';
  //   });
  //
  //   node.addEventListener('mouseout', () => {
  //     const nodes = this.timeAxisNode.querySelectorAll(`.${id}`);
  //     nodes.forEach((item) => {
  //       const icon = item.children[1] as HTMLDivElement;
  //       const detail = item.children[2] as HTMLDivElement;
  //       const arrow = item.children[3] as HTMLDivElement;
  //
  //       if (icon && detail && arrow) {
  //         icon.style.filter = '';
  //         icon.style.zIndex = '';
  //
  //         detail.style.display = 'none';
  //
  //         arrow.style.display = 'none';
  //       }
  //     });
  //     node.style.zIndex = '';
  //   });
  //
  //   const markNode = document.createElement('div'); // 创建时间轴标记节点
  //   markNode.setAttribute('class', `mark ${prop}`);
  //
  //   const iconNode = document.createElement('div'); // 创建图标标记节点
  //   iconNode.setAttribute('class', 'icon');
  //   iconNode.style.backgroundImage = `url("${url}")`;
  //
  //   const detailNode = document.createElement('div'); // 创建详细时间节点
  //   detailNode.setAttribute('class', 'detail');
  //   detailNode.textContent = nodeTime;
  //
  //   const detailArrow = document.createElement('div'); // 创建小箭头节点
  //   detailArrow.setAttribute('class', 'detail-arrow');
  //
  //   node.appendChild(markNode);
  //   node.appendChild(iconNode);
  //   node.appendChild(detailNode);
  //   node.appendChild(detailArrow);
  //   this.timeAxisNode.appendChild(node);
  //   return node;
  // }

  /** 更新子节点在时间轴上的位置 */
  // updateAxisNodes(): void {
  //   this.timeAxisNode.childNodes.forEach((child) => {
  //     const { style, dataset } = child as HTMLElement;
  //     const createTime = parseFloat(dataset.createTime as string); // 加入时间轴的节点均有创建时间数据属性
  //     const pos = ((createTime / this.timeAxis.getCurrentTime()[1]) * 100).toFixed(2);
  //     style.left = `${pos}%`;
  //   });
  // }
}


export default TimeAxisUICtl;
