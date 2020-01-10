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


/**
 * 游戏基础框架类
 * 包含场景对象、地图光照、相机对象、控制器对象、渲染器对象
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
    this.enableShadow(true); // 默认开启阴影
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.outputEncoding = GammaEncoding; // 伽玛输出
    this.renderer.physicallyCorrectLights = true; // 开启物理修正模式
  }

  /**
   * 设置场景及雾气背景色（单参）
   * @param r: 16进制色彩或字符串色彩
   */
  setColor(r: string | number): void;
  /**
   * 设置场景及雾气背景色（三参）
   * @param r: 红色通道值，范围为0-1
   * @param g: 绿色通道值，范围为0-1
   * @param b: 蓝色通道值，范围为0-1
   */
  setColor(r: number, g: number, b: number): void;
  setColor(r: number, g?: number, b?: number): void {
    const color = (g === undefined || b === undefined) ? new Color(r) : new Color(r, g, b);
    this.scene.background = color;
    if (this.scene.fog) { this.scene.fog.color = color; }
  }

  /**
   * 设置是否开启场景阴影
   * @param flag: 场景阴影开关，默认开启
   */
  enableShadow(flag: boolean): void {
    this.renderer.shadowMap.enabled = flag;
  }
}


export default GameFrame;
