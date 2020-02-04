import GameFrame from '../../modules/core/GameFrame.js';
import GameMap from '../../modules/core/GameMap.js';
import {
  Data,
  OperatorData,
  resData,
} from '../../modules/core/MapInfo';
import {
  OverlayType,
  RarityColor,
  UnitType,
} from '../../modules/others/constants.js';
import { realPosToAbsPos } from '../../modules/others/utils.js';
import StaticRenderer from '../../modules/renderers/StaticRenderer.js';
import { Vector2 } from '../../node_modules/three/build/three.module.js';
import GameController from './GameCtl.js';


/* 定义角色卡所需的数据接口，值均为地址字符串 */
interface CardData {
  icon: string;
  class: string;
  cost: string;
  rarity: string;
}


class GameUIController {
  private cardChosen: boolean; // 干员卡选择状态，在点击后应设为true，取消状态后应设为false

  private readonly unitData: { [oprType: string]: OperatorData }; // 单位名对应的单位数据

  private readonly matData: resData; // 资源数据

  private readonly map: GameMap; // 地图对象

  private readonly frame: GameFrame; // 游戏框架，用于管理事件监听

  private readonly renderer: StaticRenderer; // 静态渲染器

  private readonly mouseLayer: HTMLElement; // 跟随光标位置的叠加层元素

  private readonly gameCtl: GameController; // 游戏控制器

  constructor(frame: GameFrame, map: GameMap, gameCtl: GameController, renderer: StaticRenderer, data: Data) {
    this.frame = frame;
    this.map = map;
    this.renderer = renderer;
    this.gameCtl = gameCtl;
    this.matData = data.materials;
    this.unitData = data.units;
    this.cardChosen = false;
    this.mouseLayer = document.querySelector('.mouse-overlay') as HTMLElement;
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
      const oprData = this.unitData[opr];
      const cardData: CardData = {
        icon: this.matData.icons.operator[opr],
        class: this.matData.icons.class[oprData.class],
        cost: oprData.cost.toString(),
        rarity: this.matData.icons.rarity[oprData.rarity],
      };

      /* 创建节点元素 */
      const oprNode = document.createElement('div');
      oprNode.setAttribute('class', 'opr-card');
      oprNode.dataset.class = cardData.class;
      oprNode.dataset.cost = cardData.cost;
      oprNode.dataset.name = opr;
      oprNode.style.borderBottomColor = RarityColor[Number(oprData.rarity)];
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

      const placeLayer = this.map.getOverlay(OverlayType.PlaceLayer);
      const atkLayer = this.map.getOverlay(OverlayType.AttackLayer);
      const atkArea: Vector2[] = [];
      oprData.atkArea.forEach((tuple) => {
        atkArea.push(new Vector2(tuple[0], tuple[1])); // 转译干员攻击范围
      });
      /** 点击头像后，光标在画布上移动时执行光标位置追踪及静态渲染 */
      const canvasMousemoveHandler = (): void => {
        this.trackMouseOverlay();
        this.map.trackOverlay(atkLayer, atkArea);
        this.renderer.requestRender();
      };
      /** 当光标松开时的回调函数 */
      const mouseupCallback = (): void => {
        if (this.cardChosen) {
          this.cardChosen = false;
          this.map.hideOverlay();
          this.map.tracker.disable();

          const chosenCard = document.querySelector('#chosen') as HTMLElement;
          chosenCard.removeAttribute('id'); // 恢复未选定状态
          this.removeFromMouseOverlay();
          this.frame.removeEventListener(this.frame.canvas, 'mousemove', canvasMousemoveHandler);
          this.renderer.requestRender();
        }
      };

      /* 绑定干员头像上的按下事件 */
      oprNode.addEventListener('mousedown', () => {
        /* 显示UI */
        oprNode.setAttribute('id', 'chosen'); // 按下时进入选定状态
        placeLayer.setEnableArea(this.map.getPlaceableArea(Number(oprData.placeType)));
        placeLayer.show(); // 设置总放置叠加层的可用区域并显示
        this.map.getOverlay(OverlayType.AttackLayer).hide(); // 隐藏上次显示的区域
        this.renderer.requestRender();
        this.cardChosen = true;
        this.map.tracker.enable();

        /* 添加干员图片到指针叠加层元素 */
        const oprRes = this.matData.resources.operator[opr];
        const img = document.createElement('img');
        img.setAttribute('src', oprRes.url);
        this.mouseLayer.appendChild(img);

        /* 绑定画布上的光标移动及抬起事件 */
        this.frame.addEventListener(this.frame.canvas, 'mousemove', canvasMousemoveHandler);
        this.frame.canvas.addEventListener('mouseup', () => {
          if (this.map.tracker.pickPos !== null) {
            const pos = realPosToAbsPos(this.map.tracker.pickPos, true);
            if (placeLayer.has(pos)) {
              const unit = this.gameCtl.creatUnit(UnitType.Operator, opr, oprData);
              this.map.addUnit(pos.x, pos.y, unit);
            }
          }
          mouseupCallback();
        }, { once: true });
      });

      /* 绑定干员头像上的抬起事件 */
      oprNode.addEventListener('mouseup', mouseupCallback);
    });
  }

  /** 移除光标叠加层元素中的子元素 */
  private removeFromMouseOverlay(): void {
    this.mouseLayer.style.left = '-1000px';
    this.mouseLayer.style.top = '-1000px';
    this.mouseLayer.childNodes.forEach((node) => { node.remove(); });
  }

  /** 追踪光标位置叠加层元素 */
  private trackMouseOverlay(): void {
    if (this.map.tracker.pointerPos !== null) {
      const imgRect = (this.mouseLayer.children.item(0) as HTMLElement).getBoundingClientRect();
      this.mouseLayer.style.left = `${this.map.tracker.pointerPos.x - imgRect.width / 2}px`;
      this.mouseLayer.style.top = `${this.map.tracker.pointerPos.y - imgRect.height / 2}px`;
    }
  }
}


export default GameUIController;
