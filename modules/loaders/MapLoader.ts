/**
 * 地图加载器
 * @author: 落日羽音
 */

import { MapInfo } from '../MapInfo';


/**
 * 地图文件加载器
 * 加载成功调用onLoad回调，失败调用onError回调
 */
class MapLoader {
  onLoad?: (mapData: MapInfo) => void;

  onError?: (path: string) => void;

  constructor(onLoad?: (mapData: MapInfo) => void,
              onError?: (path: string) => void) {
    this.onLoad = onLoad;
    this.onError = onError;
  }

  /**
   * 从指定路径加载地图信息文件或地图信息对象
   * @param data: 地图文件路径或地图信息对象
   */
  load(data: string | MapInfo): void {
    if (typeof data === 'string') {
      fetch(data)
        .then((dataResp) => dataResp.json())
        .then((info: MapInfo) => {
          if (this.onLoad !== undefined) { this.onLoad(info); }
        })
        .catch((reason) => {
          if (this.onError !== undefined) { this.onError(reason); }
        });
    } else if (this.onLoad !== undefined) { this.onLoad(data); }
  }
}


export default MapLoader;
