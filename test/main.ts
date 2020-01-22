import GameFrame from '../modules/core/GameFrame.js';
import GameMap from '../modules/core/GameMap.js';
import { MapInfo } from '../modules/core/MapInfo';
import TimeAxis from '../modules/core/TimeAxis.js';
import Tracker from '../modules/core/Tracker.js';
import MapLoader from '../modules/loaders/MapLoader.js';
import { ResourcesList } from '../modules/loaders/ResourceLoader';
import { ResourceLoader } from '../modules/loaders/ResourceLoader.js';
import {
  Overlay,
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
import LoadingUICtl from './Controllers/LoadingUICtl.js';
import RenderController from './Controllers/RenderCtl.js';
import TimeAxisUICtl from './Controllers/TimeAxisUICtl.js';


const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const frame = new GameFrame(canvas);

const timeAxis = new TimeAxis();
const timeAxisUI = new TimeAxisUICtl();

const staticRenderer = new StaticRenderer(frame); // 静态渲染器
const dynamicRenderer = new DynamicRenderer(frame); // 动态渲染器
const renderCtl = new RenderController(frame, staticRenderer, dynamicRenderer);

/**
 * 游戏主函数，在资源加载完成后执行
 * @param mapInfo - 地图数据对象
 * @param resList - 总资源列表
 */
function main(mapInfo: MapInfo, resList: ResourcesList): void {
  const map = new GameMap(frame, JSON.parse(JSON.stringify(mapInfo)), resList); // 全局地图对象
  const gameCtl = new GameController(frame.scene, map, resList, timeAxisUI); // 游戏控制器
  const tracker = new Tracker(frame, map);

  /* 指定渲染控制回调 */
  renderCtl.callbacks = {
    start: (): void => timeAxis.start(),
    pause: (): void => timeAxis.stop(),
    continue: (): void => timeAxis.continue(),
    stop: (): void => timeAxis.stop(),
    reset: (): void => {
      timeAxis.stop();
      timeAxisUI.clearNodes();
      timeAxisUI.resetTimer();
      gameCtl.resetGame();
    },
  };
  renderCtl.reset();

  /* 指定每帧渲染前需要执行的回调 */
  function frameCallback(rAFTime: number): void {
    const currentTime = timeAxis.getCurrentTime(); // 当前帧时刻
    if (gameCtl.enemyCount) {
      gameCtl.updateEnemyStatus(currentTime);
      const interval = (rAFTime - dynamicRenderer.lastTime) / 1000;
      gameCtl.updateEnemyPosition(interval, currentTime);
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
  frame.clearEventListener(); // 清空监听器
}


if (checkWebGLVersion() === WebGLAvailability.Unavailable) {
  throw new Error('不支持WebGL，请更新浏览器。');
} else { // 检测webgl可用性，返回WebGLUnavailable时不支持webgl
  /* 加载总资源列表 */
  fetch('res/list.json')
    .then((resResp) => resResp.json())
    .then((resList: ResourcesList) => {
      /**
       * 加载地图需求的各类资源到总资源列表
       * @param mapData: 地图信息文件数据
       */
      function loadResources(mapData: MapInfo): void {
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
        const loadingFinished = (list: ResourcesList): void => {
          if (!errorCounter) {
            LoadingUICtl.updateLoadingBar(1, 1, () => main(mapData, list));
          }
        };

        resetGameFrame();
        const resLoader = new ResourceLoader(resList, loadingFinished, loadingProgress, loadingError);
        resLoader.load(mapData.resources);
      }

      const mapLoader = new MapLoader(loadResources, (reason) => {
        console.error('加载地图文件失败\n', reason);
      }); // 地图信息加载器
      LoadingUICtl.initUI();
      LoadingUICtl.mapSelectToLoading(mapLoader); // UI加载完成后加载地图
    })
    .catch((reason) => console.error('加载总资源列表失败\n', reason));
}
