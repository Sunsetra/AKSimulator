/**
 * 游戏基础框架
 * @author: 落日羽音
 */

import {
  AmbientLight,
  Color,
  DirectionalLight,
  GammaEncoding,
  Light,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from '../../node_modules/three/build/three.module.js';

import { OrbitControls } from '../../node_modules/three/examples/jsm/controls/OrbitControls.js';
import { WEBGL } from '../../node_modules/three/examples/jsm/WebGL.js';


/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * 游戏基础框架类
 * 包含场景对象、地图光照、相机对象、控制器对象、渲染器对象以及事件监听器管理
 */
class GameFrame {
  canvas: HTMLCanvasElement;

  lights: {
    envLight: AmbientLight;
    sunLight: DirectionalLight;
    [lightType: string]: Light;
  }; // 地图光照：至少有环境光照和直射阳光

  camera: PerspectiveCamera; // 透视摄影机

  controls: OrbitControls; // 镜头轨道控制器

  scene: Scene;

  renderer: WebGLRenderer;

  private listeners: Map<EventTarget, { [type: string]: Set<(...args: any[]) => void> }>; // 事件监听函数收集器

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.lights = {
      envLight: new AmbientLight(),
      sunLight: new DirectionalLight(),
    };

    const aspect = canvas.clientWidth / canvas.clientHeight;
    this.camera = new PerspectiveCamera();
    this.camera.aspect = aspect; // 设置相机为画布宽高比

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.2; // 开启阻尼惯性，系数0.2
    this.controls.update();

    this.scene = new Scene();
    this.setColor('black'); // 默认场景色为黑色

    let context: WebGLRenderingContext | WebGL2RenderingContext;
    if (WEBGL.isWebGL2Available()) {
      context = this.canvas.getContext('webgl2') as WebGL2RenderingContext;
    } else {
      context = this.canvas.getContext('webgl') as WebGLRenderingContext;
    }
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      context,
      antialias: true,
    });

    this.listeners = new Map();

    this.enableShadow(true); // 默认开启阴影
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.outputEncoding = GammaEncoding; // 伽玛输出
    this.renderer.physicallyCorrectLights = true; // 开启物理修正模式
  }

  /**
   * 设置场景及雾气背景色（单参）
   * @param r: 16进制颜色或颜色字符串
   */
  setColor(r: string | number): void;
  /**
   * 设置场景及雾气背景色（三参）
   * @param r: 红色通道值，范围为0-1
   * @param g: 绿色通道值，范围为0-1
   * @param b: 蓝色通道值，范围为0-1
   */
  setColor(r: number, g: number, b: number): void;
  setColor(r: string | number, g?: number, b?: number): void {
    const color = (typeof r === 'number' && g !== undefined && b !== undefined) ? new Color(r, g, b) : new Color(r);
    this.scene.background = color;
    if (this.scene.fog !== null) { this.scene.fog.color = color; }
  }

  /**
   * 设置是否开启场景阴影
   * @param flag: 场景阴影开关，默认开启
   */
  enableShadow(flag: boolean): void {
    this.renderer.shadowMap.enabled = flag;
  }

  /**
   * 向指定事件对象中添加事件监听器函数
   * 对于具名函数可以避免重复添加，对于匿名函数无法避免重复添加
   * @param obj: 事件对象
   * @param type: 事件种类
   * @param handler: 事件监听器函数
   */
  addEventListener(obj: any, type: string, handler: (...args: any[]) => void): void {
    const target = this.listeners.get(obj);
    if (target === undefined) { // 首次为对象添加监听器函数
      const handlerObj = Object.defineProperty({}, type, {
        value: new Set([handler]),
        configurable: true,
        enumerable: true,
      });
      this.listeners.set(obj, handlerObj);
    } else if (Object.prototype.hasOwnProperty.call(target, type)) { // 多次为对象添加指定事件
      if (target[type].has(handler)) { return; } // 重复添加事件监听器时返回
      target[type].add(handler);
    } else { // 首次为对象添加指定事件
      Object.defineProperty(target, type, {
        value: new Set([handler]),
        configurable: true,
        enumerable: true,
      });
    }
    obj.addEventListener(type, handler);
  }

  /**
   * 清除指定事件对象上指定类型的监听器函数（缺省时清除所有监听器）
   * @param obj: 事件对象
   * @param type: 事件种类
   * @param handler: 事件监听器函数
   */
  removeEventListener(obj: any, type: string, handler?: (...args: any[]) => void): void {
    const target = this.listeners.get(obj);
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
  clearEventListener(): void {
    this.listeners.forEach((value, target) => {
      Object.keys(value).forEach((type) => {
        value[type].forEach((handler) => { target.removeEventListener(type, handler); });
      });
    });
    this.listeners = new Map();
  }
}


export default GameFrame;
