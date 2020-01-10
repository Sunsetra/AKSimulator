/**
 * 地图信息声明文件
 * @author: 落日羽音
 */

import { Vector3 } from '../../node_modules/three/build/three.module.js';

import Building from '../buildings/Building.js';
import Enemy from '../enemies/Enemy.js';


export interface ResourceInfo {
  block: string[]; // 所需的砖块贴图
  enemy: string[]; // 所需的敌人贴图
  model: string[]; // 所需的模型

  [resType: string]: string[];
}


export interface BuildingInfo { // 建筑信息
  desc: string; // 建筑描述（大类）
  rotation?: number; // 建筑旋转角度（deg），默认为空表示0度
  sizeAlpha?: number; // 建筑缩放比例，默认为空表示1倍
  row: number; // 主建筑行位置，绑定建筑时指定
  column: number; // 主建筑列位置，绑定建筑时指定
  rowSpan?: number; // 建筑行数跨距，需跨多行时指定
  colSpan?: number; // 建筑列数跨距，需跨多列时指定
  inst: Building; // 建筑物实例，绑定建筑时指定
}


export interface BlockInfo { // 砖块信息
  row: number; // 砖块所在行数
  column: number; // 砖块所在列数
  blockType: string; // 砖块类型
  heightAlpha: number; // 砖块高度系数
  size?: Vector3; // 砖块三维世界尺寸，在创建地图时生成
  buildingInfo?: BuildingInfo; // 砖块上的建筑信息，无建筑的砖块无该属性
  texture: { // 砖块贴图
    top: string; // 砖块顶部贴图
    side: string; // 砖块侧面贴图
    bottom: string; // 砖块底部贴图
  };
}


export interface LightInfo { // 光源信息
  envIntensity: number; // 环境光强度
  envColor: string; // 环境光RGB颜色
  color: string; // 光源RGB颜色
  intensity: number; // 光源强度
  hour?: number; // 地图时间，未指定则获取本地时间
  phi?: number; // 光源方位角，未指定则使用随机方位角
}


export interface Fragment {
  id?: number; // 敌方单位唯一标识符，在出场时指定
  time: number; // 敌方单位出场时刻
  name: string; // 敌方单位名称
  path: Array<{ x: number; z: number } | { pause: number }>; // 行动路径点：普通 | 暂停
  inst?: Enemy; // 敌方单位实例
  pause?: number; // 当前敌方单位暂停时间倒计时，在暂停时指定
}


export interface WaveInfo { // 波次信息
  maxWaitingTime: number; // 距下一波次的最长等待时间
  fragments: Fragment[]; // 每个敌方单位实例
}


export interface MapInfo {
  name: string; // 地图名称
  mapWidth: number; // 地图宽度格数
  mapHeight: number; // 地图高度格数
  enemyNum: number; // 敌人总数量
  resources: ResourceInfo; // 地图所需资源信息
  blockInfo: BlockInfo[]; // 砖块信息列表
  light: LightInfo; // 光源信息
  waves: WaveInfo[]; // 波次信息
}
