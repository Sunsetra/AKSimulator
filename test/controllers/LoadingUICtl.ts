/**
 * 加载时的UI控制类
 * @author: 落日羽音
 */

import MapLoader from '../../modules/loaders/MapLoader';


class LoadingUICtl {
  /**
   * 更新加载提示
   * @param text - 要拼接在原文本后的加载提示信息
   * @param append - 提示更新模式（可选），为true时表示新增信息，默认或false为替换原信息
   */
  static updateTip(text: string, append = false): void {
    const tip: HTMLElement = document.querySelector('#progress-tip') as HTMLElement;
    tip.innerText = append ? tip.innerText + text : text;
  }

  /**
   * 重置加载进度条
   */
  static resetLoadingBar(): void {
    const bar: HTMLElement = document.querySelector('#bar') as HTMLElement;
    const left: HTMLElement = document.querySelector('#left') as HTMLElement;
    const right: HTMLElement = document.querySelector('#right') as HTMLElement;

    right.style.display = ''; // 右侧进度默认为block显示
    bar.style.width = '100%'; // 设置中部挡块宽度
    left.textContent = '0%';
    right.textContent = '0%'; // 更新加载百分比

    left.style.margin = '';
    left.style.transform = '';
    right.style.margin = '';
    right.style.transform = '';
  }

  static initUI(): void {
    /** 初始化地图选择窗口 */
    function mapSelector(): void {
      const chapterNodes = document.querySelectorAll('.chapter'); // 章节节点展开当前及关闭其他节点
      chapterNodes.forEach((node: Element) => {
        node.addEventListener('click', () => {
          const otherMapItemNode: HTMLElement | null = document.querySelector('.map-item.map-item-clicked'); // 其他展开的节点
          const thisMapItemNode: HTMLElement | null = node.querySelector('.map-item'); // 当前点击的节点
          if (otherMapItemNode && otherMapItemNode !== thisMapItemNode) {
            otherMapItemNode.classList.remove('map-item-clicked');
            const otherChapterNode = otherMapItemNode.parentNode as HTMLElement;
            otherChapterNode.style.cursor = '';
          }
          if (thisMapItemNode) {
            thisMapItemNode.classList.add('map-item-clicked');
            const { style } = node as HTMLElement;
            style.cursor = 'default';
          }
        });
      });

      const chapterHeaderNodes = document.querySelectorAll('.chapter > header'); // 标题节点只关闭当前节点
      chapterHeaderNodes.forEach((node: Element) => {
        node.addEventListener('click', (event) => {
          const thisMapItemNode = node.nextElementSibling; // 当前点击的节点
          const thisChapterNode = node.parentNode as HTMLElement;
          if (thisMapItemNode && thisMapItemNode.classList.contains('map-item-clicked')) { // 若当前点击的节点已展开
            thisMapItemNode.classList.remove('map-item-clicked');
            thisChapterNode.style.cursor = '';
            event.stopPropagation(); // 闭合节点并阻止冒泡
          }
        });
      });
    }

    mapSelector();
  }

  /**
   * 从选择地图界面切换到游戏框架
   * @param loader - 地图加载器
   */
  static mapSelectToLoading(loader: MapLoader): void {
    const currentMapNode = document.querySelectorAll('.map-item figure');
    const gameFrame: HTMLElement = document.querySelector('.game-frame') as HTMLElement;
    const mapSelect: HTMLElement = document.querySelector('.map-select') as HTMLElement;
    const loading: HTMLElement = document.querySelector('#loading') as HTMLElement;

    currentMapNode.forEach((node: Element) => {
      node.addEventListener('click', () => {
        this.resetLoadingBar();
        this.updateTip('正在加载...');

        mapSelect.style.opacity = '0';
        gameFrame.style.opacity = ''; // 游戏主框架初始透明度为0
        mapSelect.addEventListener('transitionend', () => {
          mapSelect.classList.add('side-bar'); // 将地图选择左侧边栏化
          mapSelect.style.display = 'none'; // 彻底隐藏左侧边栏
          gameFrame.style.display = ''; // 游戏主框架初始显示模式为none

          loading.style.display = 'flex';
          setTimeout(() => {
            loading.style.opacity = '1';
          }, 300);
          loading.addEventListener('transitionend', () => {
            const { dataset } = node as HTMLElement;
            if (dataset.url) { loader.load(dataset.url); }
          }, { once: true });
        }, { once: true });
      });
    });
  }

  /**
   * 更新加载进度条
   * @param itemsLoaded: 已加载资源数
   * @param itemsTotal: 总资源数
   * @param callback: 加载完成回调函数
   */
  static updateLoadingBar(itemsLoaded: number, itemsTotal: number, callback?: Function): void {
    const bar: HTMLElement = document.querySelector('#bar') as HTMLElement;
    const left: HTMLElement = document.querySelector('#left') as HTMLElement;
    const right: HTMLElement = document.querySelector('#right') as HTMLElement;

    left.style.margin = '0';
    left.style.transform = 'translateX(-50%)';
    right.style.margin = '0';
    right.style.transform = 'translateX(50%)';

    const percent: number = (itemsLoaded / itemsTotal) * 100;
    bar.style.width = `${100 - percent}%`; // 设置中部挡块宽度
    left.textContent = `${Math.round(percent)}%`;
    right.textContent = `${Math.round(percent)}%`; // 更新加载百分比

    if (percent >= 100 && callback !== undefined) { // 运行加载完成回调函数
      bar.addEventListener('transitionend', () => {
        right.style.display = 'none';
        this.updateTip('加载完成');
        setTimeout(() => { this.loadingToGameFrame(callback); }, 200);
      }, { once: true });
    }
  }

  /** 隐藏加载进度条并显示画布 */
  static loadingToGameFrame(func: Function): void {
    const loading: HTMLElement = document.querySelector('#loading') as HTMLElement;
    const gameFrame: HTMLElement = document.querySelector('.game-frame') as HTMLElement;
    const mapSelect: HTMLElement = document.querySelector('.map-select') as HTMLElement;

    loading.style.opacity = '0'; // 渐隐加载进度条
    loading.addEventListener('transitionend', () => {
      loading.style.display = 'none';
      gameFrame.style.display = 'block'; // 渐显画布
      func(); // 主回调在画布显示后运行
      mapSelect.style.display = '';

      setTimeout(() => {
        gameFrame.style.opacity = '1';
        mapSelect.style.opacity = ''; // 显示地图选择左侧边栏
      }, 200);
    }, { once: true });
    LoadingUICtl.collapseMapSelect();
  }

  /** 折叠地图选择侧边栏 */
  private static collapseMapSelect(): void {
    const expandMapItem: HTMLElement | null = document.querySelector('.map-item.map-item-clicked');
    if (expandMapItem) {
      expandMapItem.classList.remove('map-item-clicked');
    }
  }
}


export default LoadingUICtl;
