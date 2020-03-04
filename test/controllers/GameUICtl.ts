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
  realPosToAbsPos,
} from '../../modules/others/utils.js';
import StaticRenderer from '../../modules/renderers/StaticRenderer.js';
import Operator from '../../modules/units/Operator.js';
import {
  Vector2,
  Vector3,
} from '../../node_modules/three/build/three.module.js';
import GameController from './GameCtl.js';


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

  private readonly costTextNode: HTMLDivElement; // cost计数

  private readonly costBar: HTMLCanvasElement; // cost内部进度条引用，优化速度用

  private readonly costBarCtx: CanvasRenderingContext2D; // cost内部进度条上下文

  private readonly bottomUI: HTMLDivElement; // 底部UI节点

  private readonly selectCtx: CanvasRenderingContext2D; // 选择方向的画布上下文对象

  private readonly devicePixelRatio: number; // 设备像素比

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
    this.mouseLayer = document.querySelector('.mouse-overlay') as HTMLDivElement;
    this.bottomUI = document.querySelector('.ui-bottom') as HTMLDivElement;
    this.oprCards = this.bottomUI.children[2] as HTMLDivElement;
    this.center = new Vector2(0, 0);
    this.devicePixelRatio = this.frame.renderer.getPixelRatio();

    /* 选择角色叠加层相关 */
    this.selectLayer = document.querySelector('.select-overlay') as HTMLCanvasElement;
    this.selectCtx = this.selectLayer.getContext('2d') as CanvasRenderingContext2D;

    /* cost计数器相关 */
    this.costTextNode = document.querySelector('.cost span') as HTMLDivElement;
    this.costBar = document.querySelector('.cost-bar') as HTMLCanvasElement;
    this.costBar.width = 150;
    this.costBar.height = 10;
    this.costBarCtx = this.costBar.getContext('2d') as CanvasRenderingContext2D;
    const gradient = this.costBarCtx.createLinearGradient(0, 0, 0, 10);
    gradient.addColorStop(0, 'dimgrey');
    gradient.addColorStop(0.15, 'white');
    gradient.addColorStop(0.75, 'white');
    gradient.addColorStop(1, 'dimgrey');
    this.costBarCtx.strokeStyle = gradient;
    this.costBarCtx.lineWidth = 20;

    /* 以下为画布及撤退按钮关联点击事件 */
    let selectedOpr: Operator | null; // 记录当前选择的干员
    let clickPos: Vector2 | null; // 记录点击坐标

    /* 撤退按钮关联回调：撤退干员并移除叠加层上的所有点击事件处理函数 */
    const withdrawNode = document.querySelector('.ui-overlay#withdraw') as HTMLImageElement;
    this.frame.addEventListener(withdrawNode, 'click', (): void => {
      this.withdrawOperator(selectedOpr as Operator); // 绘制叠加层前选择的Operator一定存在
      this.frame.removeEventListener(this.selectLayer, 'click'); // 移除叠加层上的所有点击回调
    });

    /* 光标在画布上按下时记录点击坐标 */
    this.frame.addEventListener(this.frame.canvas, 'mousedown', () => {
      const { pickPos } = this.map.tracker;
      clickPos = pickPos;
    });

    /* 光标在画布上松开时：若与按下时位置相同才视为一次点击 */
    this.frame.addEventListener(this.frame.canvas, 'mouseup', () => {
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
                withdrawNode.style.left = `${this.center.x / this.devicePixelRatio - delta}px`;
                withdrawNode.style.top = `${this.center.y / this.devicePixelRatio - delta}px`;
              };

              /** 窗口resize事件中重新计算叠加层定位 */
              const resizeSelectLayer = (): void => {
                this.selectLayer.width = this.frame.canvas.width;
                this.selectLayer.height = this.frame.canvas.height;
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
              this.frame.addEventListener(this.selectLayer, 'click', () => {
                this.frame.removeEventListener(window, 'resize', resizeSelectLayer);
                this.hideSelectLayer();
              }, true);
              this.frame.addEventListener(window, 'resize', resizeSelectLayer);
            }
          });
        }
      }
    });
  }

  /** 重置游戏UI */
  reset(): void {
    this.updateCost();
    this.costBarCtx.clearRect(0, 0, this.costBar.width, this.costBar.height);
    this.bottomUI.children[1].textContent = this.gameCtl.ctlData.oprLimit.toString();

    (this.oprCards.childNodes as NodeListOf<HTMLElement>).forEach((child) => {
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

  /** 按cost更新UI状态（每帧执行） */
  updateUIStatus(): void {
    const intCost = Math.floor(this.gameCtl.cost);
    const scale = this.gameCtl.cost - intCost;
    /* 当cost发生变化时更新cost */
    if (intCost === this.cost) { this.drawCostBar(scale); } else {
      this.updateCost();
      this.updateCardStatus();
      this.drawCostBar(scale, true);
    }

    /* 检查冷却计时 */
    (this.oprCards.childNodes as NodeListOf<HTMLElement>).forEach((child) => {
      if (child.dataset.status === 'cd') {
        const opr = this.gameCtl.allOperator.get(child.id) as Operator; // 通过遍历干员卡不可能获取到不在全干员集合中的实例
        const cdNode = child.children[1] as HTMLDivElement;
        if (opr.rspTime > 0) {
          cdNode.textContent = opr.rspTime.toFixed(1);
        } else {
          /* 冷却结束时隐藏计时并检查该卡片的可用性 */
          cdNode.style.display = '';
          if (this.cost >= opr.cost) {
            this.enableOprCard(child);
          } else {
            this.disableOprCard(child);
          }
        }
      }
    });
  }

  /**
   * 按指定的干员名称列表创建干员头像卡
   * @param oprList - 干员名称列表
   */
  addOprCard(oprList: string[]): void {
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

    type costDict = { name: string; cost: number };
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

    const sortedOpr = sortOpr();
    sortedOpr.forEach((opr) => {
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
      const cdNode = document.createElement('div');
      const costNode = document.createElement('div');
      const costText = document.createTextNode(oprData.cost.toString());
      costNode.appendChild(costText);

      oprNode.appendChild(oprIconNode);
      oprNode.appendChild(cdNode);
      oprNode.appendChild(costNode);
      this.oprCards.appendChild(oprNode);

      const placeLayer = this.map.getOverlay(OverlayType.PlaceLayer);
      const atkLayer = this.map.getOverlay(OverlayType.AttackLayer);

      /**
       * 当释放光标时的回调函数：重置干员卡选择状态，隐藏叠加层
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
            this.frame.removeEventListener(this.frame.canvas, 'mousemove', onMousemove);
            mouseupHandler(false); // 不重置干员头像的选择状态
            this.map.addUnit(pos.x, pos.y, unit); // 添加至地图
            this.setDirection(unit);
            return;
          }
        }
        this.frame.removeEventListener(this.frame.canvas, 'mousemove', onMousemove);
        mouseupHandler();
      };

      /* 绑定干员头像上的按下事件 */
      this.frame.addEventListener(oprNode, 'mousedown', () => {
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
          this.frame.addEventListener(this.frame.canvas, 'mousemove', onMousemove);
          this.frame.addEventListener(this.frame.canvas, 'mouseup', onMouseup, true);
        } else {
          this.frame.addEventListener(this.frame.canvas, 'mouseup', () => mouseupHandler(), true);
        }
      });

      /* 绑定干员头像上的释放事件 */
      this.frame.addEventListener(oprNode, 'mouseup', () => {
        mouseupHandler();
        this.frame.removeEventListener(this.frame.canvas, 'mousemove', onMousemove);
        this.frame.removeEventListener(this.frame.canvas, 'mouseup', onMouseup);
      }); // 干员头像卡节点会被删除，无需解绑该事件
    });
  }

  /**
   * 绘制cost进度指示条
   * @param pct - 进度条宽度（百分比）
   * @param isClear - 是否清空进度条，默认为false
   */
  private drawCostBar(pct: number, isClear = false): void {
    const width = this.costBar.width * pct;
    if (isClear) {
      this.costBarCtx.clearRect(0, 0, this.costBar.width, this.costBar.height);
      this.costBarCtx.beginPath();
      this.costBarCtx.moveTo(0, 0);
    }
    this.costBarCtx.lineTo(width, 0);
    this.costBarCtx.stroke();
  }

  /** 用控制类中的cost更新本类中的整数cost */
  private updateCost(): void {
    this.cost = Math.floor(this.gameCtl.cost);
    this.costTextNode.textContent = this.cost.toString(); // 仅作显示意义
  }

  /**
   * 撤退指定干员
   * @param opr - 要撤退的干员实例
   */
  private withdrawOperator(opr: Operator): void {
    this.map.removeUnit(opr);
    const remain = this.gameCtl.removeOperator(opr.name);
    this.bottomUI.children[1].textContent = remain.toString();

    /* 撤退后更新cost */
    this.updateCost();
    const oprNode = document.querySelector(`#${opr.name}`) as HTMLDivElement;
    const cdNode = oprNode.children[1] as HTMLDivElement;
    cdNode.style.display = 'inline-block';
    cdNode.textContent = opr.rspTime.toFixed(1);
    oprNode.children[2].textContent = opr.cost.toString();
    this.hideSelectLayer();
    this.showOprCard(opr.name);
    oprNode.dataset.status = 'cd'; // 设置cd状态以便进行状态检查
    this.updateCardStatus();
  }

  /** 仅当未达到干员放置上限时，遍历更新所有干员卡状态 */
  private updateCardStatus(): void {
    if (this.gameCtl.ctlData.oprLimit - this.gameCtl.activeOperator.size > 0) {
      (this.oprCards.childNodes as NodeListOf<HTMLElement>).forEach((child) => {
        if (child.dataset.status !== 'cd') {
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
    if (pos !== undefined) {
      const height = (this.map.getBlock(pos) as BlockInfo).size.y; // 点击处砖块高度
      const realPos = absPosToRealPos(pos.x + 0.5, pos.y + 0.5); // 将点击处的砖块中心抽象坐标转换为世界坐标
      const normalizedSize = new Vector3(realPos.x, height, realPos.y).project(this.frame.camera); // 转换为标准化CSS坐标
      const centerX = (normalizedSize.x * 0.5 + 0.5) * this.frame.canvas.width;
      const centerY = (normalizedSize.y * -0.5 + 0.5) * this.frame.canvas.height;
      this.center.set(centerX, centerY);
    }

    this.selectCtx.clearRect(0, 0, this.selectLayer.width, this.selectLayer.height);
    this.selectCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.selectCtx.fillRect(0, 0, this.selectLayer.width, this.selectLayer.height);

    this.selectCtx.strokeStyle = 'white';
    this.selectCtx.lineWidth = 10;
    this.selectCtx.beginPath();
    this.selectCtx.arc(this.center.x, this.center.y, this.selectLayer.width * 0.1, 0, 2 * Math.PI);
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
        (child.children[0] as HTMLDivElement).style.filter = '';
        (child.children[2] as HTMLDivElement).style.filter = '';
        child.dataset.status = 'enable';
      });
    } else {
      (card.children[0] as HTMLDivElement).style.filter = '';
      (card.children[2] as HTMLDivElement).style.filter = '';
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
      this.selectLayer.width = this.frame.canvas.width;
      this.selectLayer.height = this.frame.canvas.height;
      this.drawSelectLayer(absPos);
    };

    /** 动画渲染 */
    const drawSelector = (e: MouseEvent): void => {
      atkLayer.hide();
      this.drawSelectLayer();

      /* 判定光标位置是在中心还是在外部 */
      const distX = e.clientX - this.center.x / this.devicePixelRatio;
      const distY = e.clientY - this.center.y / this.devicePixelRatio;
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
    this.frame.addEventListener(this.selectLayer, 'click', (e) => {
      /* 判定光标位置是在中心还是在外部 */
      const distX = e.clientX - this.center.x / this.devicePixelRatio;
      const distY = e.clientY - this.center.y / this.devicePixelRatio;
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
          this.bottomUI.children[1].textContent = remain.toString(); // 向控制器添加干员并修改干员剩余数量
          this.updateCost();

          if (remain === 0) {
            this.disableOprCard(); // 到达干员上限，禁用所有干员卡
          } else {
            this.updateCardStatus(); // 没到达上限就更新干员卡状态
          }
        } else { this.map.removeUnit(opr); }
      }
      this.frame.removeEventListener(this.selectLayer, 'mousemove', drawSelector);
      this.frame.removeEventListener(window, 'resize', resizeSelectLayer);
      this.hideSelectLayer();
    }, true);

    resizeSelectLayer();
    this.frame.addEventListener(this.selectLayer, 'mousemove', drawSelector);
    this.frame.addEventListener(window, 'resize', resizeSelectLayer);
    this.selectLayer.style.display = 'block';
  }
}


export default GameUIController;
