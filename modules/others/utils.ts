/**
 * 工具函数集
 * @author: 落日羽音
 */

import {
  BufferGeometry,
  Geometry,
  Material,
  Mesh,
  Object3D,
  Texture,
  Vector2,
} from '../../node_modules/three/build/three.module.js';
import { WEBGL } from '../../node_modules/three/examples/jsm/WebGL.js';

import {
  BlockUnit,
  WebGLAvailability,
} from './constants.js';


/**
 * 检测webgl可用性
 * @return - 返回值表示当前环境中webgl的可用性及支持的版本
 */
function checkWebGLVersion(): number {
  if (WEBGL.isWebGLAvailable()) {
    return WEBGL.isWebGL2Available() ? WebGLAvailability.WebGL2Available : WebGLAvailability.Available;
  }
  return WebGLAvailability.Unavailable;
}

/**
 * 递归释放参数对象中包含的资源
 * @param resource - 包含资源的对象
 * @returns - 返回被释放的对象
 */
function disposeResources<T>(resource: T): T {
  if (!resource) { return resource; } // 传入空对象时直接返回

  if (Array.isArray(resource)) { // 传入数组（材质对象或Object3D的children）
    resource.forEach((res: Material | Object3D) => disposeResources(res));
    return resource;
  }

  if (resource instanceof Object3D) { // 解包Object3D中的资源
    if (resource instanceof Mesh) {
      disposeResources(resource.geometry); // 解包Mesh中的几何体

      if (Array.isArray(resource.material)) { // 解包Mesh中的材质
        resource.material.forEach((mat) => disposeResources(mat));
      } else { disposeResources(resource.material); }
    }

    while (resource.children.length) { // 解包Object3D的子对象
      const firstObj = resource.children[0];
      resource.remove(firstObj);
      disposeResources(firstObj);
    }
  } else if (resource instanceof Material) {
    Object.values(resource).forEach((value) => { // 遍历材质对象中的属性值
      if (value instanceof Texture) { value.dispose(); } // 废弃其中的贴图实例
    });
    resource.dispose(); // 废弃材质对象
  } else if (resource instanceof BufferGeometry || resource instanceof Geometry) {
    resource.dispose(); // 废弃几何体对象
  }
  return resource;
}

/**
 * 将抽象坐标转换为世界坐标（二维）
 * @param x: X向抽象坐标或Vector2
 * @param z: Z向抽象坐标
 * @returns: 返回转换后的世界坐标
 */
function absPosToRealPos(x: number, z: number): Vector2;
function absPosToRealPos(x: Vector2): Vector2;
function absPosToRealPos(x: Vector2 | number, z?: number): Vector2 {
  if (x instanceof Vector2) {
    return new Vector2(x.x * BlockUnit, x.y * BlockUnit);
  }
  if (typeof z === 'number') {
    return new Vector2(x * BlockUnit, z * BlockUnit);
  }
  return new Vector2(x * BlockUnit, 0); // x为数字，z未定义则认为Z为0
}

/**
 * 将世界坐标转换为抽象坐标（二维）
 * @param a: X向世界坐标或Vector2
 * @param b: Z向世界坐标
 * @param isRound: 是否截断抽象坐标为整数
 * @returns: 返回转换后的抽象坐标
 */
function realPosToAbsPos(a: number, b: number, isRound?: boolean): Vector2;
function realPosToAbsPos(a: Vector2, b?: boolean): Vector2;
function realPosToAbsPos(a: Vector2 | number, b?: number | boolean, isRound?: boolean): Vector2 {
  let posX: number;
  let posZ: number;
  if (a instanceof Vector2) {
    posX = a.x / BlockUnit;
    posZ = a.y / BlockUnit;
    if (b) { return new Vector2(Math.floor(posX), Math.floor(posZ)); }
    return new Vector2(posX, posZ);
  }

  if (typeof b === 'number') {
    posX = a / BlockUnit;
    posZ = b / BlockUnit;
    if (isRound) { return new Vector2(Math.floor(posX), Math.floor(posZ)); }
    return new Vector2(posX, posZ);
  }

  if (isRound) { return new Vector2(Math.floor(a), 0); }
  return new Vector2(a, 0);
}

export {
  absPosToRealPos,
  realPosToAbsPos,
  checkWebGLVersion,
  disposeResources,
};
