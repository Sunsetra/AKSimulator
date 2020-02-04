/**
 * 异常类
 * @author: 落日羽音
 */

import {
  BlockInfo,
  BuildingInfo,
  Fragment,
  OperatorData,
  Resource,
} from '../core/MapInfo';


class ResourcesUnavailableError extends Error {
  constructor(msg: string, res: Resource) {
    super(msg);
    console.error(msg, res);
  }
}


class BuildingInfoError extends Error {
  constructor(msg: string, buildingInfo: BuildingInfo) {
    super(msg);
    console.error(msg, buildingInfo);
  }
}


class BlockInfoError extends Error {
  constructor(msg: string, blockInfo: BlockInfo) {
    super(msg);
    console.error(msg, blockInfo);
  }
}


class DataError extends Error {
  constructor(msg: string, blockInfo: Fragment | OperatorData) {
    super(msg);
    console.error(msg, blockInfo);
  }
}


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
