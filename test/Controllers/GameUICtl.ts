/**
 * 游戏UI控制类
 * @author: 落日羽音
 */

import GameFrame from '../../modules/core/GameFrame.js';
import GameMap from '../../modules/core/GameMap.js';
import {
  BlockInfo,
  Data,
  ResourceData,
  UnitData,
} from '../../modules/core/MapInfo.js';
import {
  OverlayType,
  RarityColor,
} from '../../modules/others/constants.js';
import {
  absPosToRealPos,
  realPosToAbsPos,
} from '../../modules/others/utils.js';
import StaticRenderer from '../../modules/renderers/StaticRenderer.js';
import Operator from '../../modules/units/Operator.js';
import {
  Vector2,
  Vector3,
} from '../../node_modules/three/build/three.module.js';
import GameController from './GameCtl.js';


/* 定义角色卡所需的资源数据接口，值均为地址字符串 */
interface CardData {
  icon: string;
  prof: string;
  cost: string;
  rarity: string;
}


/**
 * UI控制类，用于构建游戏窗口中的UI，以及获取用户交互信息并传递给游戏控制类。
 */
class GameUIController {
  private readonly unitData: UnitData; // 单位名对应的单位数据

  private readonly matData: ResourceData; // 资源数据

  private readonly map: GameMap; // 地图对象

  private readonly frame: GameFrame; // 游戏框架，用于管理事件监听

  private readonly gameCtl: GameController; // 游戏控制器

  private readonly renderer: StaticRenderer; // 静态渲染器

  private readonly oprCards: HTMLDivElement; // 干员头像卡节点

  private readonly mouseLayer: HTMLDivElement; // 跟随光标位置的叠加层元素

  private readonly selectLayer: HTMLCanvasElement; // 放置/选择干员时的画布叠加层元素

  private readonly ctx: CanvasRenderingContext2D; // 画布上下文对象

  private center: Vector2; // 干员位置中心坐标

  private cost: number; // UI显示的cost（整数）

  constructor(frame: GameFrame, map: GameMap, gameCtl: GameController, renderer: StaticRenderer, data: Data) {
    this.frame = frame;
    this.map = map;
    this.renderer = renderer;
    this.gameCtl = gameCtl;
    this.matData = data.materials;
    this.unitData = data.units;
    this.cost = Math.floor(gameCtl.cost);
    this.oprCards = document.querySelector('#operator-card') as HTMLDivElement;
    this.mouseLayer = document.querySelector('.mouse-overlay') as HTMLDivElement;
    this.selectLayer = document.querySelector('.select-overlay') as HTMLCanvasElement;
    this.ctx = this.selectLayer.getContext('2d') as CanvasRenderingContext2D;
    this.center = new Vector2(0, 0);

    /* 为画布（地面）上的点击事件绑定点击位置追踪函数 */
    this.frame.addEventListener(this.frame.canvas, 'click', () => {
      const { pickPos } = this.map.tracker;
      if (pickPos !== null) {
        const absPos = realPosToAbsPos(pickPos, true);
        const block = this.map.getBlock(absPos);
        if (block !== null) {
          /* 检查是否选中干员 */
          this.gameCtl.activeOperator.forEach((opr) => {
            if (absPos.equals(opr.position.floor())) {
              this.selectLayer.style.display = 'block';
              this.updateCenterPos(absPos);
              this.drawSelectLayer();

              const atkLayer = this.map.getOverlay(OverlayType.AttackLayer);
              atkLayer.showArea(absPos, opr.atkArea);
              this.renderer.requestRender();

              /** 检查点击位置，在范围外则隐藏叠加层 */
              const checkClickPos = (e: MouseEvent): void => {
                const distX = e.clientX - this.center.x / 2;
                const distY = e.clientY - this.center.y / 2;
                const dist = Math.sqrt(distX ** 2 + distY ** 2);
                const rad = this.selectLayer.width * 0.1; // 方向选择区半径
                if (dist > rad / 2) {
                  atkLayer.hide();
                  this.selectLayer.style.display = 'none';
                  this.frame.removeEventListener(this.selectLayer, 'click', checkClickPos);
                  this.renderer.requestRender();
                }
              };
              this.frame.addEventListener(this.selectLayer, 'click', checkClickPos);
            }
          });
        }
      }
    });
  }

  /** 重置游戏UI */
  reset(): void {
    this.cost = Math.floor(this.gameCtl.cost);
    (this.oprCards.childNodes as NodeListOf<HTMLElement>).forEach((card) => {
      card.style.display = 'block';
    });
    this.disableOprCard();
  }

  /**
   * 按cost更新UI状态
   * @param cost - 游戏当前的Cost值
   */
  updateCost(cost: number): void {
    if (Math.floor(cost) !== this.cost) {
      this.cost = Math.floor(cost);
      (this.oprCards.childNodes as NodeListOf<HTMLElement>).forEach((child) => {
        if (cost >= Number(child.dataset.cost)) {
          this.enableOprCard(child);
        } else { this.disableOprCard(child); }
      });
    }
  }

  /**
   * 按指定的干员名称列表创建干员头像卡
   * @param oprList: 干员名称列表
   */
  addOprCard(oprList: string[]): void {
    this.oprCards.childNodes.forEach((node) => { node.remove(); });
    oprList.forEach((opr) => {
      /* 收集干员信息 */
      const oprData = this.unitData.operator[opr];
      const cardData: CardData = {
        icon: this.matData.icons.operator[opr],
        prof: this.matData.icons.prof[oprData.prof.toLowerCase()],
        cost: oprData.cost.toString(),
        rarity: this.matData.icons.rarity[oprData.rarity],
      };

      /* 转译攻击范围为Vector2数组 */
      const atkArea: Vector2[] = [];
      oprData.atkArea.forEach((tuple) => {
        atkArea.push(new Vector2(tuple[0], tuple[1]));
      });

      /* 创建节点元素 */
      const oprNode = document.createElement('div');
      oprNode.setAttribute('class', 'opr-card');
      oprNode.dataset.class = cardData.prof;
      oprNode.dataset.cost = cardData.cost;
      oprNode.dataset.name = opr;
      oprNode.style.borderBottomColor = RarityColor[Number(oprData.rarity)];
      oprNode.style.background = `
        url("${cardData.prof}") no-repeat top left/25%,
        url("${cardData.rarity}") no-repeat bottom right/45%,
        url("${cardData.icon}") no-repeat top left/cover`;

      const costNode = document.createElement('div');
      const costText = document.createTextNode(cardData.cost);
      costNode.setAttribute('class', 'opr-cost');
      costNode.appendChild(costText);
      oprNode.appendChild(costNode);
      this.oprCards.appendChild(oprNode);

      const placeLayer = this.map.getOverlay(OverlayType.PlaceLayer);
      const atkLayer = this.map.getOverlay(OverlayType.AttackLayer);

      /**
       * 当光标松开时的回调函数
       * @param reset - 是否重置干员头像选择状态
       */
      const mouseupHandler = (reset = true): void => {
        /* eslint-disable @typescript-eslint/no-use-before-define */
        if (reset) {
          const chosenCard = document.querySelector('#chosen');
          if (chosenCard !== null) { chosenCard.removeAttribute('id'); } // 当干员卡还存在（未放置）时恢复未选定状态
        }
        this.map.hideOverlay();
        this.mouseLayer.style.left = '-1000px';
        this.mouseLayer.style.top = '-1000px';
        this.mouseLayer.childNodes.forEach((node) => { node.remove(); });
        this.frame.removeEventListener(this.frame.canvas, 'mousemove', canvasMousemoveHandler);
        this.frame.removeEventListener(this.frame.canvas, 'mouseup', canvasMouseupHandler);
        this.renderer.requestRender();
        /* eslint-enable @typescript-eslint/no-use-before-define */
      };

      /** 点击头像后，光标在画布上移动时执行光标位置追踪及静态渲染 */
      const canvasMousemoveHandler = (): void => {
        if (this.map.tracker.pointerPos !== null) {
          const imgRect = (this.mouseLayer.children.item(0) as HTMLElement).getBoundingClientRect();
          this.mouseLayer.style.left = `${this.map.tracker.pointerPos.x - imgRect.width / 2}px`;
          this.mouseLayer.style.top = `${this.map.tracker.pointerPos.y - imgRect.height / 2}px`;
        }
        this.map.trackOverlay(atkLayer, atkArea);
        this.renderer.requestRender();
      };

      /** 在画布元素上释放光标时的回调函数 */
      const canvasMouseupHandler = (): void => {
        if (this.map.tracker.pickPos !== null) { // 拖放位置不在地图上
          const pos = realPosToAbsPos(this.map.tracker.pickPos, true);
          if (placeLayer.has(pos)) { // 拖放位置不在父区域中
            const unit = this.gameCtl.createOperator(opr, oprData);
            if (unit !== null) { // 防止重复创建干员
              mouseupHandler(false); // 不重置干员头像的选择状态
              this.map.addUnit(pos.x, pos.y, unit); // 仅当创建成功时添加至地图
              this.setDirection(unit);
              return;
            }
          }
        }
        mouseupHandler();
      };

      /* 绑定干员头像上的按下事件 */
      oprNode.addEventListener('mousedown', () => {
        /* 显示UI */
        oprNode.setAttribute('id', 'chosen'); // 按下时进入选定状态
        placeLayer.setEnableArea(this.map.getPlaceableArea(oprData.posType));
        placeLayer.show(); // 设置总放置叠加层的可用区域并显示
        this.map.getOverlay(OverlayType.AttackLayer).hide(); // 隐藏移动光标时显示的区域
        this.renderer.requestRender();

        if (oprNode.dataset.status === 'enable') {
          /* 添加干员图片到指针叠加层元素 */
          const oprRes = this.matData.resources.operator[opr];
          const img = document.createElement('img');
          img.setAttribute('src', oprRes.url);
          this.mouseLayer.appendChild(img);

          /* 绑定画布上的光标移动及抬起事件 */
          this.frame.addEventListener(this.frame.canvas, 'mousemove', canvasMousemoveHandler);
          this.frame.addEventListener(this.frame.canvas, 'mouseup', canvasMouseupHandler);
        } else {
          this.frame.canvas.addEventListener('mouseup', () => { mouseupHandler(); }, { once: true });
        }
      });

      /* 绑定干员头像上的释放事件 */
      oprNode.addEventListener('mouseup', () => { mouseupHandler(); }); // 干员头像卡节点会被删除，无需解绑该事件
    });
    this.disableOprCard(); // 初始状态禁用所有干员卡
  }

  /**
   * 根据砖块坐标计算更新叠加层中心坐标
   * @param pos: 叠加层中心的砖块抽象坐标
   */
  private updateCenterPos(pos: Vector2): void {
    const height = (this.map.getBlock(pos) as BlockInfo).size.y; // 点击处砖块高度
    const realPos = absPosToRealPos(pos.x + 0.5, pos.y + 0.5); // 将点击处的砖块中心抽象坐标转换为世界坐标
    const normalizedSize = new Vector3(realPos.x, height, realPos.y).project(this.frame.camera); // 转换为标准化CSS坐标
    const centerX = (normalizedSize.x * 0.5 + 0.5) * this.frame.canvas.width;
    const centerY = (normalizedSize.y * -0.5 + 0.5) * this.frame.canvas.height;
    this.center.set(centerX, centerY);
  }

  /** 绘制背景区域 */
  private drawSelectLayer(): void {
    this.ctx.clearRect(0, 0, this.selectLayer.width, this.selectLayer.height);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, this.selectLayer.width, this.selectLayer.height);

    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 10;
    this.ctx.beginPath();
    this.ctx.arc(this.center.x, this.center.y, this.selectLayer.width * 0.1, 0, 2 * Math.PI);
    this.ctx.stroke();

    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.fillStyle = 'blue';
    this.ctx.fill();
    this.ctx.globalCompositeOperation = 'source-over';
  }

  /**
   * 启用指定干员卡，当省略参数时启用所有干员卡
   * @param card - 要启用的干员卡
   */
  private enableOprCard(card?: HTMLElement): void {
    if (card === undefined) {
      (this.oprCards.childNodes as NodeListOf<HTMLElement>).forEach((child) => {
        child.style.filter = '';
        child.dataset.status = 'enable';
      });
    } else {
      card.style.filter = '';
      card.dataset.status = 'enable';
    }
  }

  /**
   * 禁用指定干员卡，当省略参数时禁用所有卡
   * @param card - 要禁用的干员卡
   */
  private disableOprCard(card?: HTMLElement): void {
    if (card === undefined) {
      (this.oprCards.childNodes as NodeListOf<HTMLElement>).forEach((child) => {
        child.style.filter = 'brightness(50%)';
        child.dataset.status = 'disable';
      });
    } else {
      card.style.filter = 'brightness(50%)';
      card.dataset.status = 'disable';
    }
  }

  /**
   * 选择设置干员的朝向及攻击区域
   * @param opr: 干员实例
   */
  private setDirection(opr: Operator): void {
    const pickPos = realPosToAbsPos(this.map.tracker.pickPos as Vector2, true);
    const atkLayer = this.map.getOverlay(OverlayType.AttackLayer);
    atkLayer.hide();
    const aziAngle = this.frame.controls.getAzimuthalAngle(); // 镜头控制器的方位角 0.25-0.75在右侧 -0.25-0.25正面
    let newArea: Vector2[] = []; // 干员的新攻击范围

    /** 窗口resize事件中重新计算叠加层定位 */
    const recalculatePos = (): void => {
      this.updateCenterPos(pickPos);
      this.selectLayer.width = this.frame.canvas.width;
      this.selectLayer.height = this.frame.canvas.height;
      this.drawSelectLayer();
    };

    /** 动画渲染 */
    const drawSelector = (e: MouseEvent): void => {
      atkLayer.hide();
      this.drawSelectLayer();

      /* 判定光标位置是在中心还是在外部 */
      const distX = e.clientX - this.center.x / 2;
      const distY = e.clientY - this.center.y / 2;
      const dist = Math.sqrt(distX ** 2 + distY ** 2);
      const rad = this.selectLayer.width * 0.1; // 方向选择区半径
      if (dist < rad / 4) {
        this.ctx.strokeStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(this.center.x, this.center.y, rad / 2, 0, 2 * Math.PI);
        this.ctx.stroke();
        atkLayer.hide();
      } else {
        /* 绘制方向指示器 */
        const theta = Math.atan2(distY, distX); // 与X方向夹角
        this.ctx.strokeStyle = 'gold';
        this.ctx.beginPath();
        this.ctx.arc(this.center.x, this.center.y, rad + 20, theta - Math.PI / 4, theta + Math.PI / 4);
        this.ctx.stroke();

        /* 判定镜头及光标方位，旋转模型及叠加层 */
        const tempAzi = aziAngle - 0.25 * Math.PI; // 重置方位角为四个象限
        const sinAzi = Math.sin(tempAzi) > 0; // 镜头二象限判定
        const cosAzi = Math.cos(tempAzi) > 0; // 镜头四象限判定
        const tanAzi = Math.tan(tempAzi) > 0; // 镜头三象限判定
        const andAzi = sinAzi && cosAzi && tanAzi; // 镜头一象限判定

        const tempTheta = theta - 0.25 * Math.PI;
        const sinTheta = Math.sin(tempTheta) > 0; // 朝向二象限判定
        const cosTheta = Math.cos(tempTheta) > 0; // 朝向四象限判定
        const tanTheta = Math.tan(tempTheta) > 0; // 朝向三象限判定
        const andTheta = sinTheta && cosTheta && tanTheta; // 朝向一象限判定

        const narrowBool = !andTheta && !andAzi; // 当镜头方位角在一象限时三个判定均为true，会导致提前进入其他镜头方位角的分支

        newArea = []; // 清除上次设置的攻击区域
        if ((andAzi && andTheta)
          || (sinAzi && sinTheta && narrowBool)
          || (tanAzi && tanTheta && narrowBool)
          || (cosAzi && cosTheta && narrowBool)) {
          /* 正面向右 */
          opr.mesh.rotation.y = 0;
          newArea = opr.atkArea;
        } else if ((andAzi && sinTheta)
          || (sinAzi && tanTheta && narrowBool)
          || (tanAzi && cosTheta && narrowBool)
          || (cosAzi && andTheta)) {
          /* 正面向下 */
          opr.mesh.rotation.y = -0.5 * Math.PI;
          opr.atkArea.forEach((area) => {
            newArea.push(new Vector2(-area.y, area.x));
          });
        } else if ((andAzi && tanTheta)
          || (sinAzi && cosTheta && narrowBool)
          || (tanAzi && andTheta)
          || (cosAzi && sinTheta)) {
          /* 正面向左 */
          opr.mesh.rotation.y = Math.PI;
          opr.atkArea.forEach((area) => {
            newArea.push(new Vector2(-area.x, -area.y));
          });
        } else if ((andAzi && cosTheta)
          || (sinAzi && andTheta)
          || (tanAzi && sinTheta)
          || (cosAzi && tanTheta)) {
          /* 正面向上 */
          opr.mesh.rotation.y = 0.5 * Math.PI;
          opr.atkArea.forEach((area) => {
            newArea.push(new Vector2(area.y, -area.x));
          });
        }
        atkLayer.showArea(pickPos, newArea);
      }
      this.renderer.requestRender();
    };

    /* 关联选择方向时的点击事件（单次有效） */
    this.selectLayer.addEventListener('click', (e) => {
      /* 判定光标位置是在中心还是在外部 */
      const distX = e.clientX - this.center.x / 2;
      const distY = e.clientY - this.center.y / 2;
      const dist = Math.sqrt(distX ** 2 + distY ** 2);
      const rad = this.selectLayer.width * 0.1; // 方向选择区半径
      const chosenCard = document.querySelector('#chosen') as HTMLDivElement;
      if (chosenCard !== null) {
        chosenCard.removeAttribute('id'); // 恢复干员卡未选定状态
        if (dist > rad / 4) {
          opr.atkArea = newArea; // 更新攻击范围
          chosenCard.style.display = 'none';
          if (this.gameCtl.addOperator(opr)) { this.disableOprCard(); } // 到达干员上限，禁用所有干员卡
        } else { this.map.removeUnit(opr); }
      }

      this.frame.removeEventListener(this.selectLayer, 'mousemove', drawSelector);
      this.frame.removeEventListener(window, 'resize', recalculatePos);
      atkLayer.hide();
      this.selectLayer.style.display = 'none';
      this.renderer.requestRender();
    }, { once: true });

    recalculatePos();
    this.frame.addEventListener(this.selectLayer, 'mousemove', drawSelector);
    this.frame.addEventListener(window, 'resize', recalculatePos);
    this.selectLayer.style.display = 'block';
  }
}


export default GameUIController;
