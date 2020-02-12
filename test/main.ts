import GameFrame from '../modules/core/GameFrame.js';
import GameMap from '../modules/core/GameMap.js';
import {
  Data,
  MapInfo,
} from '../modules/core/MapInfo';
import TimeAxis from '../modules/core/TimeAxis.js';
import MapLoader from '../modules/loaders/MapLoader.js';
import ResourceLoader from '../modules/loaders/ResourceLoader.js';
import {
  GameStatus,
  WebGLAvailability,
} from '../modules/others/constants.js';
import { LoadingError } from '../modules/others/exceptions.js';
import {
  checkWebGLVersion,
  disposeResources,
} from '../modules/others/utils.js';
import DynamicRenderer from '../modules/renderers/DynamicRender.js';
import StaticRenderer from '../modules/renderers/StaticRenderer.js';
import GameController from './Controllers/GameCtl.js';
import GameUIController from './Controllers/GameUICtl.js';
import LoadingUICtl from './Controllers/LoadingUICtl.js';
import RenderController from './Controllers/RenderCtl.js';
import TimeAxisUICtl from './Controllers/TimeAxisUICtl.js';


const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const frame = new GameFrame(canvas);

const timeAxis = new TimeAxis();

const staticRenderer = new StaticRenderer(frame); // 静态渲染器
const dynamicRenderer = new DynamicRenderer(frame); // 动态渲染器
const renderCtl = new RenderController(frame, staticRenderer, dynamicRenderer);

/**
 * 游戏主函数，在资源加载完成后执行
 * @param mapInfo - 地图数据对象
 * @param data - 杂类数据对象，包括素材和单位数据
 */
function main(mapInfo: MapInfo, data: Data): void {
  const { materials } = data;
  const map = new GameMap(frame, JSON.parse(JSON.stringify(mapInfo)), materials.resources); // 全局地图对象

  /* 设置全局控制器 */
  const gameCtl = new GameController(map, data); // 游戏控制器
  const timeAxisUI = new TimeAxisUICtl(materials.resources);
  const gameUICtl = new GameUIController(frame, map, gameCtl, staticRenderer, data);
  gameUICtl.addOprCard(['haze']);

  /* 指定渲染控制回调 */
  renderCtl.callbacks = {
    start: (): void => {
      timeAxis.start();
      gameCtl.setStatus(GameStatus.Running);
    },
    pause: (): void => timeAxis.stop(),
    continue: (): void => timeAxis.continue(),
    stop: (): void => timeAxis.stop(),
    reset: (): void => {
      timeAxis.stop();
      timeAxisUI.clearNodes();
      timeAxisUI.resetTimer();
      map.hideOverlay();
      gameCtl.setStatus(GameStatus.Standby);
      gameCtl.reset();
      gameUICtl.reset();
    },
  };
  renderCtl.reset();

  /* 指定每帧渲染前需要执行的回调 */
  function frameCallback(rAFTime: number): void {
    /* 执行位置和状态更新 */
    const currentTime = timeAxis.getCurrentTime(); // 当前帧时刻
    if (gameCtl.getStatus() === GameStatus.Running || gameCtl.getStatus() === GameStatus.Standby) {
      const interval = (rAFTime - dynamicRenderer.lastTime) / 1000;
      gameUICtl.updateCost(gameCtl.updateCost(interval));
      gameCtl.updateEnemyStatus(timeAxisUI, currentTime);
      gameCtl.updateEnemyPosition(timeAxisUI, interval, currentTime);
      timeAxisUI.setTimer(currentTime[0]); // 更新计时器
      timeAxisUI.updateAxisNodes(currentTime[1]); // 更新时间轴图标
    } else {
      dynamicRenderer.stopRender();
      renderCtl.stop(); // 游戏结束，需重置战场
    }
  }

  dynamicRenderer.callback = frameCallback;

  /* 切换标签页时暂停动画 */
  frame.addEventListener(document, 'visibilitychange', () => {
    if (document.visibilityState === 'hidden') { renderCtl.pause(); }
  });
}

/** 重置游戏框架 */
function resetGameFrame(): void {
  renderCtl.reset(); // 重置渲染及时间轴
  disposeResources(frame.scene); // 废弃原地图中的资源
  frame.scene.dispose(); // 清除场景对象中的其余资源
  frame.clearEventListener(); // 清空监听器
}

/** 异步获取所需的数据文件 */
async function fetchData(): Promise<Data> {
  const fetchResInfo = fetch('res/list.json'); // 加载总资源列表
  const fetchUnitInfo = fetch('res/unit_data.json'); // 加载数据文件
  const response = await Promise.all([fetchResInfo, fetchUnitInfo]);
  return {
    materials: await response[0].json(),
    units: await response[1].json(),
  };
}


/* 程序入口点：先检测webgl可用性，返回WebGLUnavailable时不支持webgl */
if (checkWebGLVersion() === WebGLAvailability.Unavailable) {
  throw new Error('不支持WebGL，请更新浏览器。');
} else {
  fetchData().then((data) => {
    /**
     * 加载新地图数据后运行此函数，加载所需的资源到总资源列表
     * @param mapData: 地图信息文件数据
     */
    const loadResources = (mapData: MapInfo): void => {
      let errorCounter = 0;

      /** 加载进度监控及加载完成回调函数 */
      const loadingProgress = (_: string, itemsLoaded: number, itemsTotal: number): void => {
        if (!errorCounter) { // 仅在没有加载错误的加载过程中更新进度
          if (itemsLoaded !== itemsTotal) { LoadingUICtl.updateLoadingBar(itemsLoaded, itemsTotal); }
        }
      };

      /** 加载错误处理函数 */
      const loadingError = (url: string): void => {
        if (!errorCounter) { LoadingUICtl.updateTip(''); } // 出现第一个错误时清除原信息，后面追加信息
        errorCounter += 1;
        LoadingUICtl.updateTip(`加载${url}时发生错误`, true);
        throw new LoadingError(`加载${url}时发生错误`);
      };

      /** 加载完成回调函数 */
      const loadingFinished = (miscData: Data): void => {
        if (!errorCounter) {
          LoadingUICtl.updateLoadingBar(1, 1, () => main(mapData, miscData));
        }
      };

      resetGameFrame();
      const resLoader = new ResourceLoader(data, loadingFinished, loadingProgress, loadingError);
      resLoader.load(mapData.resources);
    };

    /* 声明地图加载器。为方便切换地图时资源重用，地图数据不放在数据加载函数中 */
    const mapLoader = new MapLoader(loadResources, (reason) => {
      console.error('加载地图文件失败\n', reason);
    });
    LoadingUICtl.initUI();
    LoadingUICtl.mapSelectToLoading(mapLoader); // 将地图加载器绑定至UI点击事件
  });
}
