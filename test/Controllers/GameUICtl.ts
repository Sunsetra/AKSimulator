import GameFrame from '../../modules/core/GameFrame';
import GameMap from '../../modules/core/GameMap.js';
import {
  Data,
  IconList,
  oprData,
} from '../../modules/core/MapInfo';
import {
  OverlayType,
  RarityColor,
} from '../../modules/others/constants.js';
import { realPosToAbsPos } from '../../modules/others/utils.js';
import StaticRenderer from '../../modules/renderers/StaticRenderer.js';
import { Vector2 } from '../../node_modules/three/build/three.module.js';


/* 定义角色卡所需的数据接口，值均为地址字符串 */
interface CardData {
  icon: string;
  class: string;
  cost: string;
  rarity: string;
}


class GameUIController {
  cardChosen: boolean; // 干员卡选择状态，在点击后应设为true，取消状态后应设为false

  private readonly unitData: oprData; // 单位名对应的单位数据

  private readonly iconData: IconList; // 图标资源数据

  private readonly map: GameMap; // 地图对象

  private readonly frame: GameFrame; // 游戏框架

  private readonly renderer: StaticRenderer; // 静态渲染器

  constructor(frame: GameFrame, map: GameMap, renderer: StaticRenderer, data: Data) {
    this.frame = frame;
    this.map = map;
    this.renderer = renderer;
    this.iconData = data.materials.icons;
    this.unitData = data.units;
    this.cardChosen = false;
  }

  /**
   * 按指定的干员名称列表创建干员头像卡
   * @param oprList: 干员名称列表
   */
  addOprCard(oprList: string[]): void {
    const oprCardNode = document.querySelector('#operator-card') as HTMLElement;
    oprCardNode.childNodes.forEach((node) => { node.remove(); });
    oprList.forEach((opr) => {
      /* 收集干员信息 */
      const data = this.unitData[opr];
      const cardData: CardData = {
        icon: this.iconData.operator[opr],
        class: this.iconData.class[data.class],
        cost: data.cost.toString(),
        rarity: this.iconData.rarity[data.rarity],
      };

      /* 创建节点元素 */
      const oprNode = document.createElement('div');
      oprNode.setAttribute('class', 'operator');
      oprNode.dataset.class = cardData.class;
      oprNode.dataset.cost = cardData.cost;
      oprNode.dataset.name = opr;
      oprNode.style.borderBottomColor = RarityColor[Number(data.rarity)];
      oprNode.style.background = `
        url("${cardData.class}") no-repeat top left/25%,
        url("${cardData.rarity}") no-repeat bottom right/45%,
        url("${cardData.icon}") no-repeat top left/cover`;

      const costNode = document.createElement('div');
      const costText = document.createTextNode(cardData.cost);
      costNode.setAttribute('class', 'opr-cost');
      costNode.appendChild(costText);
      oprNode.appendChild(costNode);
      oprCardNode.appendChild(oprNode);

      /* 绑定点击事件 */
      oprNode.addEventListener('mousedown', () => {
        oprNode.setAttribute('id', 'chosen'); // 按下时进入选定状态

        const placeLayer = this.map.getOverlay(OverlayType.PlaceLayer);
        placeLayer.setEnableArea(this.map.getPlaceableArea(Number(data.placeType)));
        placeLayer.show(); // 设置总放置叠加层的可用区域并显示
        this.map.getOverlay(OverlayType.AttackLayer).hide(); // 隐藏上次显示的区域
        this.renderer.requestRender();

        this.cardChosen = true;
        this.map.tracker.enable();

        this.frame.addEventListener(this.frame.canvas, 'mousemove', this.canvasMousemoveHandler);
        this.frame.canvas.addEventListener('mouseup', () => {
          if (this.map.tracker.pickPos !== null) {
            const pos = realPosToAbsPos(this.map.tracker.pickPos, true);
            if (placeLayer.has(pos)) { console.log(pos); }
          }
          this.mouseupCallback();
        }, { once: true });
      });

      oprNode.addEventListener('mouseup', this.mouseupCallback);
    });
  }

  /** 点击头像后，光标在画布上移动时执行光标位置追踪及静态渲染 */
  private canvasMousemoveHandler = (): void => {
    const atkLayer = this.map.getOverlay(OverlayType.AttackLayer);
    this.map.trackOverlay(atkLayer, [new Vector2(0, 0), new Vector2(1, 0)]);
    this.renderer.requestRender();
  };

  /** 当光标在角色头像上松开时的回调函数 */
  private mouseupCallback = (): void => {
    if (this.cardChosen) {
      const chosenCard = document.querySelector('#chosen') as HTMLElement;
      chosenCard.removeAttribute('id'); // 恢复未选定状态
      this.cardChosen = false;
      this.map.hideOverlay();
      this.map.tracker.disable();
      this.frame.removeEventListener(this.frame.canvas, 'mousemove', this.canvasMousemoveHandler);
      this.renderer.requestRender();
    }
  };
}


export default GameUIController;
