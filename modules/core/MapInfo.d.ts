/**
 * 地图信息声明文件
 * @author: 落日羽音
 */

import {
  BufferGeometry,
  Material,
  Mesh,
  Texture,
  Vector3,
} from '../../node_modules/three/build/three.module.js';

import Building from '../buildings/Building.js';
import Enemy from '../enemies/Enemy.js';
import { BlockType } from '../others/constants.js';


export interface Data {
  materials: resData;
  units: { [oprType: string]: OperatorData };
}


export type resData = { resources: ResourcesList; icons: IconList };


/* 干员数据接口 */
export interface OperatorData {
  prof: string; // 干员职业
  posType: string; // 干员可放置砖块类别，见BlockType常量
  rarity: number; // 干员稀有度
  maxHp: number; // 干员血量
  atk: number; // 干员攻击力
  def: number; // 物理防御力
  resist: number; // 法术抗性
  cost: number; // 干员cost
  block: number; // 阻挡数
  atkTime: number; // 攻击速度
  respawnTime: number; // 再部署时间
  hpRecoveryPerSec: number; // 每秒自回血量
  spRecoveryPerSec: number; // 每秒自回技力
  maxDeployCount: number; // 最大布署数量
  tauntLevel: number; // 嘲讽等级
  massLevel: number; // 重量等级
  stunImmune: boolean; // 眩晕抗性
  silenceImmune: boolean; // 沉默抗性
  atkArea: [number, number][]; // 攻击范围
}


/* 总资源列表对象 */
export interface ResourcesList {
  block: { [texType: string]: Resource }; // 砖块贴图
  EDPoint: { [texType: string]: Resource }; // 进出点贴图
  enemy: { [texType: string]: Resource }; // 敌人贴图
  operator: { [texType: string]: Resource }; // 干员贴图
  model: {
    [texType: string]: Resource;
    destination: Resource;
    entry: Resource;
  }; // 导入模型
  [resType: string]: { [texType: string]: Resource };
}


/* 资源对象 */
export interface Resource {
  url: string; // 资源URL
  tex?: Texture; // 贴图型资源
  geo?: BufferGeometry; // 资源几何体
  mat?: Material | Material[]; // 资源材质
  entity?: Mesh; // 实体网格体
}


/* 图标资源列表 */
export interface IconList {
  prof: { [classType: string]: string }; // 干员职业图标
  rarity: { [rarity: string]: string }; // 干员稀有度图标
  operator: { [oprType: string]: string }; // 干员头像图标
}


/* 地图所需的资源信息 */
export interface ResourceInfo {
  block: string[]; // 所需的砖块贴图
  enemy: string[]; // 所需的敌人贴图
  model: string[]; // 所需的模型
  [resType: string]: string[];
}


/* 建筑信息 */
export interface BuildingInfo {
  desc: string; // 建筑描述（大类）
  rotation?: number; // 建筑旋转角度（deg），默认为空表示0度
  sizeAlpha?: number; // 建筑缩放比例，默认为空表示1倍
  x: number; // 主建筑X坐标，绑定建筑时指定
  z: number; // 主建筑Z坐标，绑定建筑时指定
  xSpan?: number; // 建筑列数跨距，需跨多列时指定
  zSpan?: number; // 建筑行数跨距，需跨多行时指定
  inst: Building; // 建筑物实例，绑定建筑时指定
}


/* 砖块信息 */
export interface BlockInfo {
  x: number; // 砖块所在X坐标
  z: number; // 砖块所在Z坐标
  blockType: BlockType; // 砖块类型
  placeable: boolean; // 是否可以放置干员
  passable: boolean; // 是否可通过
  heightAlpha: number; // 砖块高度系数
  size: Vector3; // 砖块三维世界尺寸，在创建地图时生成
  overlay?: Map<number, Mesh>; // 砖块叠加层，数字表示层数，0层最低
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
