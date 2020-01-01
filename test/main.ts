import { WebGLUnavailable } from '../modules/constant.js';
import GameFrame from '../modules/core/GameFrame.js';
import Map from '../modules/core/Map.js';
import MapLoader from '../modules/loaders/MapLoader.js';
import {
  ResourceLoader,
  ResourcesList,
} from '../modules/loaders/ResourceLoader';
import { MapInfo } from '../modules/MapInfo';
import StaticRenderer from '../modules/renderers/StaticRenderer.js';
import {
  checkWebGLVersion,
  disposeResources,
} from '../modules/utils.js';
import { LoadingUI } from './UIController.js';


const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const frame = new GameFrame(canvas);

/**
 * 游戏主函数，在资源加载完成后执行
 * @param mapInfo - 地图数据对象
 * @param resList - 总资源列表
 */
function main(mapInfo: MapInfo, resList: ResourcesList): void {
  let map: Map; // 全局当前地图对象
  const staticRenderer = new StaticRenderer(frame);
  const staticRender = staticRenderer.requestRender.bind(staticRenderer);

  /**
   * 根据地图数据创建地图及建筑
   * @param mapData - json格式的地图数据
   */
  function createMap(mapData: MapInfo): void {
    map = new Map(mapData, resList); // 初始化地图
    map.createMap(frame);
  }

  createMap(JSON.parse(JSON.stringify(mapInfo))); // 创建地图
  staticRenderer.requestRender(); // 发出渲染请求

  frame.controls.addEventListener('change', staticRender);
  window.addEventListener('resize', staticRender);
}


if (checkWebGLVersion() === WebGLUnavailable) {
  console.error('不支持WebGL，请更新浏览器。');
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
        disposeResources(frame.scene); // 加载新资源前废弃原地图中的资源
        let errorCounter = 0;

        /** 加载进度监控及加载完成回调函数 */
        const loadingProgress = (_: string, itemsLoaded: number, itemsTotal: number): void => {
          if (!errorCounter) { // 仅在没有加载错误的加载过程中更新进度
            if (itemsLoaded !== itemsTotal) { LoadingUI.updateLoadingBar(itemsLoaded, itemsTotal); }
          }
        };

        /** 加载错误处理函数 */
        const loadingError = (url: string): void => {
          if (!errorCounter) { LoadingUI.updateTip(''); } // 出现第一个错误时清除原信息，后面追加信息
          errorCounter += 1;
          LoadingUI.updateTip(`加载${url}时发生错误`, true);
        };

        /** 加载完成回调函数 */
        const loadingFinished = (list: ResourcesList): void => {
          if (!errorCounter) {
            LoadingUI.updateLoadingBar(1, 1, () => main(mapData, list));
          }
        };

        const resLoader = new ResourceLoader(resList, loadingFinished, loadingProgress, loadingError);
        resLoader.load(mapData.resources);
      }

      const mapLoader = new MapLoader(loadResources, (reason) => {
        console.error('加载地图文件失败\n', reason);
      }); // 地图信息加载器
      LoadingUI.initUI();
      LoadingUI.mapSelectToLoading(mapLoader);
    })
    .catch((reason) => console.error('加载总资源列表失败\n', reason));
}
