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
import { OrbitControls } from '../../node_modules/three/examples/jsm/controls/OrbitControls.js';
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
  if (a instanceof Vector2) {
    if (b) { return new Vector2(a.x / BlockUnit, a.y / BlockUnit).floor(); }
    return new Vector2(a.x / BlockUnit, a.y / BlockUnit);
  }

  if (typeof b === 'number') {
    if (isRound) { return new Vector2(a / BlockUnit, b / BlockUnit).floor(); }
    return new Vector2(a / BlockUnit, b / BlockUnit);
  }

  if (isRound) { return new Vector2(a, 0).floor(); }
  return new Vector2(a, 0);
}

const listeners: Map<EventTarget, { [type: string]: Set<EventListenerOrEventListenerObject> }> = new Map();

/**
 * 向指定事件对象中添加事件监听器函数
 * 对于具名函数可以避免重复添加，对于匿名函数无法避免重复添加
 * @param obj - 事件对象
 * @param type - 事件种类
 * @param handler - 事件监听器函数
 * @param once - 单次触发事件
 */
function addEvListener<T extends Window, K extends keyof WindowEventMap>(
  obj: T, type: K, handler: (arg: WindowEventMap[K]) => void, once?: boolean,
): void;
function addEvListener<T extends Document, K extends keyof DocumentEventMap>(
  obj: T, type: K, handler: (arg: DocumentEventMap[K]) => void, once?: boolean,
): void;
function addEvListener<T extends HTMLElement, K extends keyof HTMLElementEventMap>(
  obj: T, type: K, handler: (arg: HTMLElementEventMap[K]) => void, once?: boolean,
): void;
function addEvListener<T extends OrbitControls>(
  obj: T, type: string, handler: EventListenerOrEventListenerObject, once?: boolean,
): void;
function addEvListener<T extends EventTarget>(
  obj: T, type: string, handler: EventListenerOrEventListenerObject, once?: boolean,
): void {
  const target = listeners.get(obj);
  if (target === undefined) { // 首次为对象添加监听器函数
    const handlerObj = Object.defineProperty({}, type, {
      value: new Set([handler]),
      configurable: true,
      enumerable: true,
    });
    listeners.set(obj, handlerObj);
  } else if (Object.prototype.hasOwnProperty.call(target, type)) { // 多次为对象添加指定事件
    if (!once && target[type].has(handler)) { return; } // 重复添加事件监听器时返回
    target[type].add(handler); // 但单次生效的事件无此限制
  } else { // 首次为对象添加指定事件
    Object.defineProperty(target, type, {
      value: new Set([handler]),
      configurable: true,
      enumerable: true,
    });
  }
  if (once) {
    obj.addEventListener(type, handler, { once: true });
  } else {
    obj.addEventListener(type, handler);
  }
}

/**
 * 清除指定事件对象上指定类型的监听器函数（缺省时清除所有监听器）
 * @param obj - 事件对象
 * @param type - 事件种类
 * @param handler - 事件监听器函数
 */
function removeEvListener<T extends Window, K extends keyof WindowEventMap>(
  obj: T, type: K, handler?: (arg: WindowEventMap[K]) => void,
): void;
function removeEvListener<T extends Document, K extends keyof DocumentEventMap>(
  obj: T, type: K, handler?: (arg: DocumentEventMap[K]) => void,
): void;
function removeEvListener<T extends HTMLElement, K extends keyof HTMLElementEventMap>(
  obj: T, type: K, handler?: (arg: HTMLElementEventMap[K]) => void,
): void;
function removeEvListener<T extends OrbitControls>(
  obj: T, type: string, handler?: EventListenerOrEventListenerObject,
): void;
function removeEvListener<T extends EventTarget>(
  obj: T, type: string, handler?: EventListenerOrEventListenerObject,
): void {
  const target = listeners.get(obj);
  if (target === undefined || !Object.prototype.hasOwnProperty.call(target, type) || !target[type].size) {
    return; // 该对象未添加过事件监听，或该事件未注册，或事件注册函数的Set为空
  }
  if (handler === undefined) { // 清除指定事件的所有监听器
    target[type].forEach((h) => { obj.removeEventListener(type, h); });
    delete target[type];
  } else {
    if (!target[type].has(handler)) { return; } // 该监听函数不在已有的函数列表内返回
    obj.removeEventListener(type, handler);
    target[type].delete(handler);
  }
}

/**
 * 清除所有的监听器
 */
function clearEvListener(): void {
  listeners.forEach((value, target) => {
    Object.keys(value).forEach((type) => {
      value[type].forEach((handler) => { target.removeEventListener(type, handler); });
    });
  });
  listeners.clear();
}

export {
  absPosToRealPos,
  realPosToAbsPos,
  checkWebGLVersion,
  disposeResources,
  addEvListener,
  removeEvListener,
  clearEvListener,
};
