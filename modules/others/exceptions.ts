/**
 * 异常类
 * @author: 落日羽音
 */

import {
  BlockInfo,
  BuildingInfo,
  EnemyWrapper,
  OperatorData,
  Resource,
} from '../core/MapInfo';


/**
 * 资源失效异常类
 * @param msg - 异常消息
 * @param res - 发生异常的资源对象
 */
class ResourcesUnavailableError extends Error {
  constructor(msg: string, res: Resource) {
    super(msg);
    console.error(msg, res);
  }
}


/**
 * 建筑信息错误异常类
 * @param msg - 异常消息
 * @param res - 发生异常的建筑信息对象
 */
class BuildingInfoError extends Error {
  constructor(msg: string, buildingInfo: BuildingInfo) {
    super(msg);
    console.error(msg, buildingInfo);
  }
}


/**
 * 砖块信息错误异常类
 * @param msg - 异常消息
 * @param res - 发生异常的砖块信息对象
 */
class BlockInfoError extends Error {
  constructor(msg: string, blockInfo: BlockInfo) {
    super(msg);
    console.error(msg, blockInfo);
  }
}


/**
 * 数据信息错误异常类
 * @param msg - 异常消息
 * @param res - 发生异常的单位数据信息对象
 */
class DataError extends Error {
  constructor(msg: string, blockInfo: EnemyWrapper | OperatorData) {
    super(msg);
    console.error(msg, blockInfo);
  }
}


/**
 * 加载时错误异常类
 * @param msg - 异常消息
 */
class LoadingError extends Error {
  constructor(msg: string) {
    super(msg);
    console.error(msg);
  }
}


export {
  BlockInfoError,
  BuildingInfoError,
  DataError,
  LoadingError,
  ResourcesUnavailableError,
};
