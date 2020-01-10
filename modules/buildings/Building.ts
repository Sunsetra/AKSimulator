/**
 * 基础建筑类
 * @author: 落日羽音
 */

import {
  Box3,
  Math as _Math,
  Mesh,
  Object3D,
  Vector3,
} from '../../node_modules/three/build/three.module.js';

import { BuildingInfo } from '../core/MapInfo';
import { BlockUnit } from '../others/constants.js';


class Building {
  mesh: Object3D; // 建筑使用的标准化后的实体

  size: Vector3; // 建筑尺寸

  rowSpan: number; // 建筑跨行

  colSpan: number; // 建筑跨列

  /**
   * 创建标准化地图建筑对象
   * @param mesh: 建筑网格实体
   * @param info: 建筑信息对象
   */
  constructor(mesh: Mesh, info: BuildingInfo) {
    this.colSpan = info.colSpan ? info.colSpan : 1;
    this.rowSpan = info.rowSpan ? info.rowSpan : 1;
    const rotation = info.rotation ? info.rotation : 0;
    const sizeAlpha = info.sizeAlpha ? info.sizeAlpha : 1;

    mesh.rotation.y = _Math.degToRad(rotation);
    mesh.geometry.center(); // 重置原点为几何中心
    mesh.geometry.computeBoundingBox();
    mesh.geometry.boundingBox.getCenter(mesh.position);
    const wrapper = new Object3D(); // 使用外部对象包裹
    wrapper.add(mesh);
    const originBox = new Box3().setFromObject(wrapper);
    const originSize = originBox.getSize(new Vector3());
    const magX = (BlockUnit * this.colSpan * sizeAlpha - 0.02) / originSize.x;
    const magZ = (BlockUnit * this.rowSpan * sizeAlpha - 0.02) / originSize.z;
    const magY = Math.min(magX, magZ); // Y轴方向缩放取跨距较小的方向的缩放比例
    wrapper.scale.set(magX, magY, magZ);

    this.mesh = wrapper;
    const box = new Box3().setFromObject(this.mesh);
    this.size = new Vector3(); // 缩放后的尺寸
    box.getSize(this.size);
  }
}


export default Building;
