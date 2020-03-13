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
  RenderType,
} from '../../modules/others/constants.js';
import {
  absPosToRealPos,
  addEvListener,
  realPosToAbsPos,
  removeEvListener,
} from '../../modules/others/utils.js';
import StaticRenderer from '../../modules/renderers/StaticRenderer.js';
import Operator from '../../modules/units/Operator.js';
import {
  Vector2,
  Vector3,
} from '../../node_modules/three/build/three.module.js';
import GameController from './GameCtl.js';

/* 每个CD中的干员卡对象都应包含：画布节点、画布上下文、干员对象 */
type CdOprNode = [HTMLCanvasElement, CanvasRenderingContext2D, Operator];


/**
 * UI控制类，用于构建游戏窗口中的UI，以及获取用户交互信息并传递给游戏控制类。
 */
class GameUIController {
  private center: Vector2; // 选定干员的位置中心坐标

  private cost: number; // UI显示的cost（整数）

  private readonly unitData: UnitData; // 单位名对应的单位数据

  private readonly matData: ResourceData; // 资源数据

  private readonly map: GameMap; // 地图对象

  private readonly frame: GameFrame; // 游戏框架

  private readonly gameCtl: GameController; // 游戏控制器

  private readonly renderer: StaticRenderer; // 静态渲染器

  private readonly oprCards: HTMLDivElement; // 干员头像卡节点

  private readonly dpr: number; // 设备像素比

  private readonly cdOpr: Map<HTMLDivElement, CdOprNode>; // 正在CD的干员信息对象映射

  private readonly mouseLayer: HTMLDivElement; // 跟随光标位置的叠加层元素

  /* 放置/选择干员时的画布叠加层元素 */
  private readonly selectLayer: HTMLCanvasElement;

  private readonly selectCtx: CanvasRenderingContext2D;

  /* cost计数器区域 */
  private readonly costCounter: HTMLCanvasElement;

  private readonly costCounterCtx: CanvasRenderingContext2D;

  /* cost内部进度条引用，优化速度用 */
  private readonly costBar: HTMLCanvasElement;

  private readonly costBarCtx: CanvasRenderingContext2D;

  /* 干员计数画布元素 */
  private readonly oprCounter: HTMLCanvasElement;

  private readonly oprCounterCtx: CanvasRenderingContext2D;

  constructor(frame: GameFrame, map: GameMap, gameCtl: GameController, renderer: StaticRenderer, data: Data) {
    this.frame = frame;
    this.map = map;
    this.renderer = renderer;
    this.gameCtl = gameCtl;
    this.matData = data.materials;
    this.unitData = data.units;
    this.cost = Math.floor(gameCtl.cost);
    this.center = new Vector2(0, 0);
    this.cdOpr = new Map<HTMLDivElement, CdOprNode>();
    this.dpr = this.frame.renderer.getPixelRatio();

    this.mouseLayer = document.querySelector('.mouse-overlay') as HTMLDivElement;
    this.oprCards = document.querySelector('.operator-cards') as HTMLDivElement;

    /* 放置/选择干员叠加层相关 */
    this.selectLayer = document.querySelector('.select-overlay') as HTMLCanvasElement;
    this.selectCtx = this.selectLayer.getContext('2d') as CanvasRenderingContext2D;
    this.selectCtx.scale(this.dpr, this.dpr);

    /* cost计数器 */
    this.costCounter = document.querySelector('.cost-counter') as HTMLCanvasElement;
    this.costCounterCtx = this.costCounter.getContext('2d') as CanvasRenderingContext2D;
    this.costCounterCtx.scale(this.dpr, this.dpr);

    /* cost进度条相关 */
    this.costBar = document.querySelector('.cost-bar') as HTMLCanvasElement;
    this.costBarCtx = this.costBar.getContext('2d') as CanvasRenderingContext2D;
    this.costBarCtx.scale(this.dpr, this.dpr);

    /* 干员计数 */
    this.oprCounter = document.querySelector('.operator-counter canvas') as HTMLCanvasElement;
    this.oprCounterCtx = this.oprCounter.getContext('2d') as CanvasRenderingContext2D;
    this.oprCounterCtx.scale(this.dpr, this.dpr);

    /* 浏览器窗口尺寸调整时：
     * 重新计算并设置各画布的渲染尺寸及样式；
     * 重绘各画布区域。
     */
    addEvListener(window, 'resize', () => {
      /* 重新计算cost计数器的尺寸 */
      const costRect = this.costCounter.getBoundingClientRect();
      this.costCounter.width = costRect.width * this.dpr;
      this.costCounter.height = costRect.height * this.dpr;
      this.costCounterCtx.textAlign = 'center';
      this.costCounterCtx.textBaseline = 'middle';
      this.costCounterCtx.fillStyle = 'white';
      this.costCounterCtx.font = `${this.costCounter.height}px sans-serif`;

      /* 重新计算cost进度条的尺寸 */
      const barRect = this.costBar.getBoundingClientRect();
      this.costBar.width = barRect.width * this.dpr;
      this.costBar.height = barRect.height * this.dpr;
      this.costBarCtx.lineWidth = this.costBar.height;

      const gradient = this.costBarCtx.createLinearGradient(0, 0, 0, this.costBar.height);
      gradient.addColorStop(0, 'dimgrey');
      gradient.addColorStop(0.25, 'white');
      gradient.addColorStop(0.75, 'white');
      gradient.addColorStop(1, 'dimgrey');
      this.costBarCtx.strokeStyle = gradient;

      /* 重新计算干员计数器的尺寸 */
      const oprCounterRect = this.oprCounter.getBoundingClientRect();
      this.oprCounter.width = oprCounterRect.width * this.dpr;
      this.oprCounter.height = oprCounterRect.height * this.dpr;
      this.oprCounterCtx.fillStyle = 'white';
      this.oprCounterCtx.textBaseline = 'middle';
      this.oprCounterCtx.font = `${this.oprCounter.height}px sans-serif`;

      /* 重新计算各干员卡上的冷却计时器尺寸 */
      (this.oprCards.childNodes as NodeListOf<HTMLElement>).forEach((card) => {
        const cdNode = card.querySelector('canvas') as HTMLCanvasElement;
        const cdRect = cdNode.getBoundingClientRect();
        cdNode.width = cdRect.width * this.dpr;
        cdNode.height = cdRect.height * this.dpr;

        const cdCtx = cdNode.getContext('2d') as CanvasRenderingContext2D;
        cdCtx.fillStyle = 'white';
        cdCtx.textBaseline = 'middle';
        cdCtx.textAlign = 'center';
        cdCtx.font = `${cdNode.height / 3}px sans-serif`;
      });

      /* 重绘各画布区域 */
      this.updateCost();
      this.drawCostBar(this.gameCtl.cost - this.cost);
      this.drawOprCount(this.gameCtl.ctlData.oprLimit - this.cdOpr.size);
      this.updateOprCD();
    });


    /* 画布及撤退按钮关联点击事件 */
    let selectedOpr: Operator | null; // 记录当前选择的干员
    let clickPos: Vector2 | null; // 记录点击坐标

    /* TODO: 画布化拖拽小图。撤退按钮关联回调：撤退干员并移除叠加层上的所有点击事件处理函数 */
    const withdrawNode = document.querySelector('.ui-overlay#withdraw') as HTMLImageElement;
    addEvListener(withdrawNode, 'click', (): void => {
      this.withdrawOperator(selectedOpr as Operator); // 绘制叠加层前选择的Operator一定存在
      removeEvListener(this.selectLayer, 'click'); // 移除叠加层上的所有点击回调
    });

    /* 光标在画布上按下时记录点击坐标 */
    addEvListener(this.frame.canvas, 'mousedown', () => { clickPos = this.map.tracker.pickPos; });

    /* 光标在画布上松开时：若与按下时位置相同才视为一次点击 */
    addEvListener(this.frame.canvas, 'mouseup', () => {
      const { pickPos } = this.map.tracker;
      if (pickPos !== null && clickPos === pickPos) {
        const absPos = realPosToAbsPos(pickPos, true);
        if (this.map.getBlock(absPos) !== null) {
          /* 遍历检查是否选中干员 */
          this.gameCtl.activeOperator.forEach((opr) => {
            if (absPos.equals(opr.position.floor())) {
              selectedOpr = opr;

              /** 计算并放置各操作按钮的位置 */
              const calcIconsPos = (): void => {
                const rad = this.selectLayer.width * 0.1;
                const delta = rad / Math.sqrt(2) / 2;
                withdrawNode.style.left = `${this.center.x / this.dpr - delta}px`;
                withdrawNode.style.top = `${this.center.y / this.dpr - delta}px`;
              };

              /** 窗口resize事件中重新计算叠加层定位 */
              const resizeSelectLayer = (): void => {
                const selectLayerRect = this.selectLayer.getBoundingClientRect();
                this.selectLayer.width = selectLayerRect.width * this.dpr;
                this.selectLayer.height = selectLayerRect.height * this.dpr;
                this.drawSelectLayer(absPos);
                calcIconsPos(); // 要先重设中心点位坐标再定位图标
              };

              /* 绘制UI */
              this.selectLayer.style.display = 'block';
              withdrawNode.style.display = 'block';
              resizeSelectLayer();

              const atkLayer = this.map.getOverlay(OverlayType.AttackLayer);
              atkLayer.showArea(absPos, opr.atkArea);
              if (this.frame.status.renderType !== RenderType.DynamicRender) { this.renderer.requestRender(); }

              /* 关联叠加层上点击时隐藏叠加层，以及窗口resize事件 */
              addEvListener(this.selectLayer, 'click', () => {
                removeEvListener(window, 'resize', resizeSelectLayer);
                this.hideSelectLayer();
              }, true);
              addEvListener(window, 'resize', resizeSelectLayer);
            }
          });
        }
      }
    });
  }

  /** 以游戏控制类中的信息重置游戏UI（外部调用；需要游戏控制类先重置内部变量） */
  reset(): void {
    this.updateCost();

    /* 重绘画布 */
    this.drawCostBar(0, true);
    this.drawOprCount(this.gameCtl.ctlData.oprLimit);
    this.updateOprCD(true);

    /* 重置干员卡状态 */
    (this.oprCards.childNodes as NodeListOf<HTMLDivElement>).forEach((child) => {
      const cdNode = child.children[1] as HTMLDivElement;
      cdNode.textContent = '';
      cdNode.style.display = '';
      const originCost = this.unitData.operator[child.id].cost;
      child.children[2].textContent = originCost.toString();
      child.dataset.status = ''; // 清除状态标志以便更新卡片状态
    });
    this.showOprCard();
    this.updateCardStatus();
  }

  /** 按cost更新UI状态（外部调用；每帧执行） */
  updateUIStatus(): void {
    const intCost = Math.floor(this.gameCtl.cost);
    const scale = this.gameCtl.cost - intCost;
    /* 当cost发生变化时更新cost */
    if (intCost === this.cost) { this.drawCostBar(scale); } else {
      this.updateCost();
      this.updateCardStatus();
      this.drawCostBar(scale, true);
    }
    this.updateOprCD();
  }

  /**
   * 按指定的干员名称列表创建干员头像卡并关联头像卡相关事件
   * @param oprList - 需要创建的干员名称列表
   */
  addOprCard(oprList: string[]): void {
    type costDict = { name: string; cost: number };
    /**
     * 根据干员星级生成svg
     * @param n - 干员星级
     * @return - 返回生成的svg对象
     */
    const drawStars = (n: number): string => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', `${-150 * (n - 1)} 0 ${270 + (n - 1) * 146} 256`);

      const stl = document.createElement('style');
      stl.textContent = '.st0{fill:#F7DF42;stroke:#787878;stroke-width:2;stroke-linejoin:round;stroke-miterlimit:10;}';
      svg.appendChild(stl);

      for (let i = 0; i < n; i += 1) {
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('class', 'st0');
        polygon.setAttribute('points',
          `${156 - (n - 1) * 1.6 - 150 * i},39.3 ${156 - (n - 1) * 1.6 - 150 * i},107.5 
                  ${220.8 - (n - 1) * 1.6 - 150 * i},128.5 ${156 - (n - 1) * 1.6 - 150 * i},149.5 
                  ${156 - (n - 1) * 1.6 - 150 * i},217.7 ${116 - (n - 1) * 1.6 - 150 * i},162.6 
                  ${51.2 - (n - 1) * 1.6 - 150 * i},183.6 ${91.2 - (n - 1) * 1.6 - 150 * i},128.5 
                  ${51.2 - (n - 1) * 1.6 - 150 * i},73.4 ${116 - (n - 1) * 1.6 - 150 * i},94.4`);
        svg.appendChild(polygon);
      }
      return `url(data:image/svg+xml;base64,${btoa(new XMLSerializer().serializeToString(svg))})`;
    };

    /**
     * 维护大顶堆顺序
     * @param list - 大顶堆数组
     * @param i - 当前节点的索引
     */
    const swapNode = (list: costDict[], i: number): void => {
      const [lIndex, rIndex] = [2 * i + 1, 2 * i + 2];
      if (list[lIndex] === undefined) { return; } // 左子节点不存在则直接返回
      if (list[rIndex] === undefined) {
        if (list[i].cost < list[lIndex].cost) { [list[i], list[lIndex]] = [list[lIndex], list[i]]; } // 右子节点不存在则仅比较左子节点
        return;
      }
      [lIndex, rIndex].forEach((index) => {
        if (list[i].cost < list[index].cost) {
          [list[i], list[index]] = [list[index], list[i]];
          swapNode(list, index); // 当前节点交换后递归排列当前节点的子孙节点
        }
      });
    };

    /** 按cost排序干员列表（堆排序） */
    const sortOpr = (): string[] => {
      const costDict: costDict[] = [];
      const result: string[] = [];
      /* 构建初始排序字典 */
      oprList.forEach((opr) => { costDict.push({ name: opr, cost: this.unitData.operator[opr].cost }); });

      while (costDict.length > 0) {
        for (let m = Math.floor(costDict.length / 2 - 1); m >= 0; m -= 1) { swapNode(costDict, m); }
        [costDict[0], costDict[costDict.length - 1]] = [costDict[costDict.length - 1], costDict[0]];
        result.unshift((costDict.pop() as costDict).name);
      }
      return result;
    };

    while (this.oprCards.childNodes.length) { this.oprCards.childNodes[0].remove(); } // 移除所有原干员卡节点

    sortOpr().forEach((opr) => {
      /* 收集干员信息并创建实例 */
      const oprData = this.unitData.operator[opr];
      const unit = this.gameCtl.createOperator(opr, oprData);

      /* 转译攻击范围为Vector2数组 */
      const atkArea: Vector2[] = [];
      oprData.atkArea.forEach((tuple) => {
        atkArea.push(new Vector2(tuple[0], tuple[1]));
      });


      /* 创建节点元素 */
      const oprNode = document.createElement('div');
      oprNode.setAttribute('id', opr);
      oprNode.dataset.class = oprData.prof;
      oprNode.style.borderBottomColor = RarityColor[Number(oprData.rarity)];

      const oprIconNode = document.createElement('div');
      oprIconNode.style.background = `
        url("${this.matData.icons.prof[oprData.prof.toLowerCase()]}") no-repeat top left 35% / 21%,
        ${drawStars(oprData.rarity)} no-repeat bottom right / auto 17%,
        url("${this.matData.icons.operator[opr]}") no-repeat top left / cover`;

      const cdNode = document.createElement('canvas');
      (cdNode.getContext('2d') as CanvasRenderingContext2D).scale(this.dpr, this.dpr);

      const costNode = document.createElement('div');
      const costText = document.createTextNode(oprData.cost.toString());
      costNode.appendChild(costText);

      oprNode.appendChild(oprIconNode);
      oprNode.appendChild(cdNode);
      oprNode.appendChild(costNode);
      this.oprCards.appendChild(oprNode);


      /* 关联事件回调 */
      const placeLayer = this.map.getOverlay(OverlayType.PlaceLayer);
      const atkLayer = this.map.getOverlay(OverlayType.AttackLayer);

      /**
       * 释放光标时的通用回调：重置干员卡选择状态，隐藏叠加层
       * @param reset - 是否重置干员头像选择状态
       */
      const mouseupHandler = (reset = true): void => {
        if (reset) {
          const chosenCard = document.querySelector('.chosen');
          if (chosenCard !== null) { chosenCard.classList.remove('chosen'); } // 当干员卡还存在（未放置）时恢复未选定状态
        }
        this.mouseLayer.style.display = '';
        this.map.hideOverlay();
        if (this.frame.status.renderType !== RenderType.DynamicRender) { this.renderer.requestRender(); }
      };

      /** 点击头像后，光标在画布上移动时执行光标位置追踪及静态渲染 */
      const onMousemove = (): void => {
        if (this.map.tracker.pointerPos !== null) {
          this.mouseLayer.style.display = 'block';
          const imgRect = this.mouseLayer.children[0].getBoundingClientRect();
          this.mouseLayer.style.left = `${this.map.tracker.pointerPos.x - imgRect.width / 2}px`;
          this.mouseLayer.style.top = `${this.map.tracker.pointerPos.y - imgRect.height / 2}px`;
        }
        this.map.trackOverlay(atkLayer, atkArea);
        if (this.frame.status.renderType !== RenderType.DynamicRender) { this.renderer.requestRender(); }
      };

      /** 在画布元素上释放光标时的回调函数 */
      const onMouseup = (): void => {
        if (this.map.tracker.pickPos !== null) { // 拖放位置在地面上
          const pos = realPosToAbsPos(this.map.tracker.pickPos, true);
          if (placeLayer.has(pos)) { // 拖放位置在父区域中
            removeEvListener(this.frame.canvas, 'mousemove', onMousemove);
            mouseupHandler(false); // 不重置干员头像的选择状态
            this.map.addUnit(pos.x, pos.y, unit); // 添加至地图
            this.setDirection(unit);
            return;
          }
        }
        removeEvListener(this.frame.canvas, 'mousemove', onMousemove);
        mouseupHandler();
      };

      /* 绑定干员头像上的按下事件 */
      addEvListener(oprNode, 'mousedown', () => {
        /* 显示区域叠加层 */
        oprNode.classList.add('chosen'); // 按下时进入选定状态
        placeLayer.setEnableArea(this.map.getPlaceableArea(oprData.posType));
        placeLayer.show(); // 设置总放置叠加层的可用区域并显示
        if (this.frame.status.renderType !== RenderType.DynamicRender) { this.renderer.requestRender(); }

        if (oprNode.dataset.status === 'enable') {
          /* 添加干员图片到指针叠加层元素 */
          const oprRes = this.matData.resources.operator[opr];
          this.mouseLayer.children[0].setAttribute('src', oprRes.url);

          /* 绑定画布上的光标移动及抬起事件 */
          addEvListener(this.frame.canvas, 'mousemove', onMousemove);
          addEvListener(this.frame.canvas, 'mouseup', onMouseup, true);
        } else {
          addEvListener(this.frame.canvas, 'mouseup', () => mouseupHandler(), true);
        }
      });

      /* 绑定干员头像上的释放事件 */
      addEvListener(oprNode, 'mouseup', () => {
        mouseupHandler();
        removeEvListener(this.frame.canvas, 'mousemove', onMousemove);
        removeEvListener(this.frame.canvas, 'mouseup', onMouseup);
      }); // 干员头像卡节点会被删除，无需解绑该事件
    });
  }

  /** 用控制类中的cost更新本类中的整数cost并绘制cost计数器 */
  private updateCost(): void {
    this.cost = Math.floor(this.gameCtl.cost);

    const { width, height } = this.costCounter;
    this.costCounterCtx.clearRect(0, 0, width, height);
    this.costCounterCtx.fillText(this.cost.toString(), width / 2, height / 1.5);
  }

  /**
   * 绘制cost进度指示条
   * @param pct - 进度条宽度（百分比）
   * @param isClear - 是否清空进度条，默认为false
   */
  private drawCostBar(pct: number, isClear = false): void {
    const { width, height } = this.costBar;
    if (isClear) {
      this.costBarCtx.clearRect(0, 0, width, height);
      this.costBarCtx.beginPath();
    }
    this.costBarCtx.moveTo(0, height / 2);
    this.costBarCtx.lineTo(width * pct, height / 2);
    this.costBarCtx.stroke();
  }

  /**
   * 绘制剩余可放置干员数量
   * @param num - 剩余干员数量
   */
  private drawOprCount(num: number | string): void {
    const count = typeof num === 'number' ? num.toString() : num;
    const { width, height } = this.oprCounter;
    this.oprCounterCtx.clearRect(0, 0, width, height);
    this.oprCounterCtx.fillText(count, 0, height / 1.5);
  }

  /**
   * 仅当未达到干员放置上限时，遍历更新所有干员卡（除冷却中）状态。
   * 开销：遍历所有卡片节点。
   */
  private updateCardStatus(): void {
    if (this.gameCtl.ctlData.oprLimit - this.gameCtl.activeOperator.size > 0) {
      (this.oprCards.childNodes as NodeListOf<HTMLDivElement>).forEach((child) => {
        if (!this.cdOpr.has(child)) {
          const opr = this.gameCtl.allOperator.get(child.id);
          if (opr !== undefined && this.cost >= opr.cost) {
            this.enableOprCard(child);
          } else {
            this.disableOprCard(child);
          }
        }
      });
    }
  }

  /**
   * 更新正在冷却的干员卡计时
   * @param clearAll - 清除所有冷却计时的显示（与干员内部冷却计时无关）
   */
  private updateOprCD(clearAll = false): void {
    this.cdOpr.forEach((card, key) => {
      const [node, ctx, opr] = card;
      const { width, height } = node;
      ctx.clearRect(0, 0, width, height);

      if (opr.rspTime > 0 && !clearAll) {
        ctx.fillText(opr.rspTime.toFixed(1), width / 2, height / 2);
      } else {
        if (this.cost >= opr.cost) {
          this.enableOprCard(key);
        } else {
          this.disableOprCard(key);
        }
        this.cdOpr.delete(key);
      }
    });
  }

  /**
   * 撤退指定干员
   * @param opr - 要撤退的干员实例
   */
  private withdrawOperator(opr: Operator): void {
    this.map.removeUnit(opr);
    const remain = this.gameCtl.removeOperator(opr.name);
    this.drawOprCount(remain);

    /* 撤退后更新cost */
    this.updateCost();
    const oprNode = document.querySelector(`#${opr.name}`) as HTMLDivElement;
    const canvas = oprNode.querySelector('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    this.cdOpr.set(oprNode, [canvas, ctx, opr]);

    /* 更新UI显示 */
    oprNode.children[2].textContent = opr.cost.toString();
    this.hideSelectLayer();
    this.showOprCard(opr.name);
    this.updateCardStatus(); // 需要立即更新卡片状态而不能在Cost更新时更新
    this.updateOprCD();
  }

  /** 隐藏选择叠加层 */
  private hideSelectLayer(): void {
    this.map.hideOverlay();
    this.selectLayer.style.display = 'none';
    const overlayUI = document.querySelectorAll('.ui-overlay') as NodeListOf<HTMLElement>;
    overlayUI.forEach((child) => { child.style.display = 'none'; });
    if (this.frame.status.renderType !== RenderType.DynamicRender) { this.renderer.requestRender(); }
  }

  /**
   * 绘制选择叠加层。
   * 当传入叠加层中心砖块抽象坐标时，以该坐标值重设当前中心变量。
   * @param pos - 叠加层中心的砖块抽象坐标
   */
  private drawSelectLayer(pos?: Vector2): void {
    const { width, height } = this.selectLayer;
    if (pos !== undefined) {
      const bHeight = (this.map.getBlock(pos) as BlockInfo).size.y; // 点击处砖块高度
      const realPos = absPosToRealPos(pos.x + 0.5, pos.y + 0.5); // 将点击处的砖块中心抽象坐标转换为世界坐标
      const normalizedSize = new Vector3(realPos.x, bHeight, realPos.y).project(this.frame.camera); // 转换为标准化CSS坐标
      const centerX = (normalizedSize.x * 0.5 + 0.5) * this.frame.canvas.width;
      const centerY = (normalizedSize.y * -0.5 + 0.5) * this.frame.canvas.height;
      this.center.set(centerX, centerY);
    }

    this.selectCtx.clearRect(0, 0, width, height);
    this.selectCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.selectCtx.fillRect(0, 0, width, height);

    this.selectCtx.strokeStyle = 'white';
    this.selectCtx.lineWidth = 10;
    this.selectCtx.beginPath();
    this.selectCtx.arc(this.center.x, this.center.y, width * 0.1, 0, 2 * Math.PI);
    this.selectCtx.stroke();

    this.selectCtx.globalCompositeOperation = 'destination-out';
    this.selectCtx.fillStyle = 'blue';
    this.selectCtx.fill();
    this.selectCtx.globalCompositeOperation = 'source-over';
  }

  /**
   * 启用指定干员卡，当省略参数时启用所有干员卡
   * @param card - 要启用的干员卡
   */
  private enableOprCard(card?: HTMLElement): void {
    if (card === undefined) {
      (this.oprCards.childNodes as NodeListOf<HTMLElement>).forEach((child) => {
        (child.children[0] as HTMLDivElement).style.filter = 'brightness(100%)';
        (child.children[2] as HTMLDivElement).style.filter = 'brightness(100%)';
        child.dataset.status = 'enable';
      });
    } else {
      (card.children[0] as HTMLDivElement).style.filter = 'brightness(100%)';
      (card.children[2] as HTMLDivElement).style.filter = 'brightness(100%)';
      card.dataset.status = 'enable';
    }
  }

  /**
   * 禁用指定干员卡，当省略参数时禁用所有卡
   * @param card - 要禁用的干员卡元素或干员名称
   */
  private disableOprCard(card?: HTMLElement | string): void {
    if (card === undefined) {
      (this.oprCards.childNodes as NodeListOf<HTMLElement>).forEach((child) => {
        (child.children[0] as HTMLDivElement).style.filter = 'brightness(50%)';
        (child.children[2] as HTMLDivElement).style.filter = 'brightness(50%)';
        child.dataset.status = 'disable';
      });
    } else if (typeof card === 'string') {
      const oprNode = document.querySelector(`#${card}`);
      if (oprNode !== null) {
        (oprNode.children[0] as HTMLDivElement).style.filter = 'brightness(50%)';
        (oprNode.children[2] as HTMLDivElement).style.filter = 'brightness(50%)';
        (oprNode as HTMLElement).dataset.status = 'disable';
      }
    } else {
      (card.children[0] as HTMLDivElement).style.filter = 'brightness(50%)';
      (card.children[2] as HTMLDivElement).style.filter = 'brightness(50%)';
      card.dataset.status = 'disable';
    }
  }

  /**
   * 从干员卡列表中移除指定卡
   * @param card - 要移除的干员卡
   */
  private hideOprCard(card: HTMLElement): void {
    if (this.oprCards.children.length === 1) {
      card.style.visibility = 'hidden'; // 最后一卡设为不可见以保持父元素高度
    } else {
      card.style.display = 'none';
    }
  }

  /**
   * 显示指定的干员卡
   * @param oprName - 要显示的干员名称，缺省时显示所有干员卡
   */
  private showOprCard(oprName?: string): void {
    if (oprName === undefined) {
      (this.oprCards.childNodes as NodeListOf<HTMLElement>).forEach((card) => {
        card.style.visibility = '';
        card.style.display = '';
      });
    } else {
      const oprNode = document.querySelector(`#${oprName}`) as HTMLDivElement;
      if (oprNode !== null) {
        oprNode.style.visibility = '';
        oprNode.style.display = '';
      }
    }
  }

  /**
   * 选择设置干员的朝向及攻击区域
   * @param opr: 干员实例
   */
  private setDirection(opr: Operator): void {
    const absPos = realPosToAbsPos(this.map.tracker.pickPos as Vector2, true);
    const atkLayer = this.map.getOverlay(OverlayType.AttackLayer);
    atkLayer.hide();
    const aziAngle = this.frame.controls.getAzimuthalAngle(); // 镜头控制器的方位角 0.25-0.75在右侧 -0.25-0.25正面
    let newArea: Vector2[] = []; // 干员的新攻击范围

    /* 转译攻击范围为Vector2数组 */
    const originArea: Vector2[] = [];
    this.unitData.operator[opr.name].atkArea.forEach((tuple) => {
      originArea.push(new Vector2(tuple[0], tuple[1]));
    });

    /** 窗口resize事件中重新计算叠加层定位 */
    const resizeSelectLayer = (): void => {
      const selectLayerRect = this.selectLayer.getBoundingClientRect();
      this.selectLayer.width = selectLayerRect.width * this.dpr;
      this.selectLayer.height = selectLayerRect.height * this.dpr;
      this.drawSelectLayer(absPos);
    };

    /** 动画渲染 */
    const drawSelector = (e: MouseEvent): void => {
      atkLayer.hide();
      this.drawSelectLayer();

      /* 判定光标位置是在中心还是在外部 */
      const distX = e.clientX - this.center.x / this.dpr;
      const distY = e.clientY - this.center.y / this.dpr;
      const dist = Math.sqrt(distX ** 2 + distY ** 2);
      const diam = this.selectLayer.width * 0.1; // 方向选择区直径
      if (dist < diam / 4) {
        this.selectCtx.strokeStyle = 'white';
        this.selectCtx.beginPath();
        this.selectCtx.arc(this.center.x, this.center.y, diam / 2, 0, 2 * Math.PI);
        this.selectCtx.stroke();
        atkLayer.hide();
      } else {
        /* 绘制方向指示器 */
        const theta = Math.atan2(distY, distX); // 与X方向夹角
        this.selectCtx.strokeStyle = 'gold';
        this.selectCtx.beginPath();
        this.selectCtx.arc(this.center.x, this.center.y, diam + 20, theta - Math.PI / 4, theta + Math.PI / 4);
        this.selectCtx.stroke();

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
          newArea = originArea;
        } else if ((andAzi && sinTheta)
          || (sinAzi && tanTheta && narrowBool)
          || (tanAzi && cosTheta && narrowBool)
          || (cosAzi && andTheta)) {
          /* 正面向下 */
          opr.mesh.rotation.y = -0.5 * Math.PI;
          originArea.forEach((area) => {
            newArea.push(new Vector2(-area.y, area.x));
          });
        } else if ((andAzi && tanTheta)
          || (sinAzi && cosTheta && narrowBool)
          || (tanAzi && andTheta)
          || (cosAzi && sinTheta)) {
          /* 正面向左 */
          opr.mesh.rotation.y = Math.PI;
          originArea.forEach((area) => {
            newArea.push(new Vector2(-area.x, -area.y));
          });
        } else if ((andAzi && cosTheta)
          || (sinAzi && andTheta)
          || (tanAzi && sinTheta)
          || (cosAzi && tanTheta)) {
          /* 正面向上 */
          opr.mesh.rotation.y = 0.5 * Math.PI;
          originArea.forEach((area) => {
            newArea.push(new Vector2(area.y, -area.x));
          });
        }
        atkLayer.showArea(absPos, newArea);
      }
      if (this.frame.status.renderType !== RenderType.DynamicRender) { this.renderer.requestRender(); }
    };

    /* 关联选择方向时的点击事件（单次有效） */
    addEvListener(this.selectLayer, 'click', (e) => {
      /* 判定光标位置是在中心还是在外部 */
      const distX = e.clientX - this.center.x / this.dpr;
      const distY = e.clientY - this.center.y / this.dpr;
      const dist = Math.sqrt(distX ** 2 + distY ** 2);
      const diam = this.selectLayer.width * 0.1; // 方向选择区直径
      const chosenCard = document.querySelector('.chosen') as HTMLDivElement;
      if (chosenCard !== null) {
        chosenCard.classList.remove('chosen'); // 恢复干员卡未选定状态
        if (dist > diam / 4) {
          /* 放置时更新cost */
          opr.atkArea = newArea; // 更新攻击范围
          this.hideOprCard(chosenCard); // 隐藏当前干员卡

          const remain = this.gameCtl.addOperator(opr);
          this.drawOprCount(remain);
          this.updateCost();

          if (remain === 0) {
            this.disableOprCard(); // 到达干员上限，禁用所有干员卡
          } else {
            this.updateCardStatus(); // 没到达上限就更新干员卡状态
          }
        } else { this.map.removeUnit(opr); }
      }
      removeEvListener(this.selectLayer, 'mousemove', drawSelector);
      removeEvListener(window, 'resize', resizeSelectLayer);
      this.hideSelectLayer();
    }, true);

    this.selectLayer.style.display = 'block';
    resizeSelectLayer();
    addEvListener(this.selectLayer, 'mousemove', drawSelector);
    addEvListener(window, 'resize', resizeSelectLayer);
  }
}


export default GameUIController;
