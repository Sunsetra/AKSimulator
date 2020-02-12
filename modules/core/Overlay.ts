/**
 * 叠加层类：创建并管理浮于地表的叠加层的相关属性及行为
 * @author: 落日羽音
 */

import {
  Color,
  MeshBasicMaterial,
  Texture,
  Vector2,
} from '../../node_modules/three/build/three.module.js';

import { OverlayType } from '../others/constants.js';
import GameMap from './GameMap.js';


class Overlay {
  readonly parent: Overlay | undefined; // 父叠加层对象

  private enableArea: Vector2[]; // 当前叠加层可用区域

  private readonly map: GameMap;

  private readonly depth: OverlayType; // 叠加层深度，依叠加层种类而定

  private visible: boolean | null; // 当前叠加层的可见性，当且仅当所有均不可见时值为false，部分隐藏时值为null

  /**
   * 创建叠加层构造函数
   * @param map: 地图对象
   * @param depth: 叠加层高度，0为最底层
   * @param parent: 父叠加层对象
   */
  constructor(map: GameMap, depth: OverlayType, parent?: Overlay) {
    this.map = map;
    this.depth = depth;
    this.parent = parent;
    this.visible = false;
    this.enableArea = []; // 初始状态时，叠加层可用区域为空
  }

  /** 获取当前可用叠加层的可见性 */
  get visibility(): boolean | null {
    return this.visible;
  }

  /**
   * 设置整体叠加层样式
   * @param style: 提供叠加层贴图或纯色叠加层
   */
  setOverlayStyle(style: Texture | Color | string | number): void {
    this.map.getBlocks().forEach((block) => {
      if (block !== null && block.overlay !== undefined) {
        const mesh = block.overlay.get(this.depth); // 获取当前砖块上的叠加层
        if (mesh !== undefined) {
          if (style instanceof Texture) {
            (mesh.material as MeshBasicMaterial).map = style;
          } else {
            (mesh.material as MeshBasicMaterial).color = new Color(style);
          }
        }
      }
    });
  }

  /**
   * 检查指定位置是否位于当前叠加层的可用范围内
   * @param x: 目标位置的Vector2对象或X坐标
   * @param y: 目标位置的Y坐标
   */
  has(x: number, y: number): boolean;

  has(x: Vector2): boolean;

  has(x: Vector2 | number, y?: number): boolean {
    const pos = x instanceof Vector2 ? x : new Vector2(x, y);
    for (let i = 0; i < this.enableArea.length; i += 1) {
      if (this.enableArea[i].equals(pos)) { return true; }
    }
    return false;
  }

  /** 将所有可用叠加层设置为显示 */
  show(): void {
    if (!this.visible) { // 仅当全隐藏或部分隐藏时显示
      for (let i = 0; i < this.enableArea.length; i += 1) {
        const block = this.map.getBlock(this.enableArea[i]);
        if (block !== null && block.overlay !== undefined) {
          const mesh = block.overlay.get(this.depth); // 遍历范围内砖块的叠加层
          if (mesh !== undefined) { mesh.visible = true; }
        }
      }
      this.visible = true;
    }
  }

  /**
   * 以指定位置为原点，显示叠加层上的指定区域
   * @param center: 区域的显示原点
   * @param area: 区域指示列表
   */
  showArea(center: Vector2, area: Vector2[]): void {
    area.forEach((point) => {
      const newPos = new Vector2().addVectors(center, point);
      this.setOverlayVisibility(newPos, true);
    });
  }

  /** 将所有可用叠加层设置为隐藏 */
  hide(): void {
    if (this.visible !== false) { // 仅当全显示或部分隐藏时隐藏
      for (let i = 0; i < this.enableArea.length; i += 1) {
        const block = this.map.getBlock(this.enableArea[i]);
        if (block !== null && block.overlay !== undefined) {
          const mesh = block.overlay.get(this.depth); // 遍历范围内砖块的叠加层
          if (mesh !== undefined) { mesh.visible = false; }
        }
      }
      this.visible = false;
    }
  }

  /**
   * 设定指定位置的叠加层的可见性，必须在可用区域内
   * @param a: 目标叠加层所在的砖块
   * @param b: 新可见性
   */
  setOverlayVisibility(a: Vector2, b: boolean): void;

  setOverlayVisibility(a: number, b: number, c: boolean): void;

  setOverlayVisibility(a: Vector2 | number, b: number | boolean, c?: boolean): void {
    /* 计算目标叠加层的位置 */
    let pos: Vector2;
    if (typeof a === 'number') {
      if (typeof b === 'number') {
        pos = new Vector2(a, b);
      } else { pos = new Vector2(a, 0); }
    } else { pos = a; }

    if (this.has(pos)) { // 检查设置位置是否在可用区域内
      const block = this.map.getBlock(pos);
      if (block !== null && block.overlay !== undefined) {
        const mesh = block.overlay.get(this.depth);
        if (typeof b === 'boolean' && mesh !== undefined) { // 二参重载
          mesh.visible = b;
          this.updateVisibility(b);
        } else if (c !== undefined && mesh !== undefined) { // 三参重载
          mesh.visible = c;
          this.updateVisibility(c);
        }
      }
    }
  }

  /**
   * 设置新的可用区域，若原为显示状态会自动隐藏
   * @param area: 新的可用区域
   */
  setEnableArea(area: Vector2[]): void {
    this.hide();
    this.enableArea = area;
  }

  /**
   * 设置当前叠加层对象的可见性属性
   * 所有砖块可见为true，所有不可见为false，部分可见为null
   * @param state: 新可见性
   */
  private updateVisibility(state: boolean): void {
    for (let i = 0; i < this.enableArea.length; i += 1) {
      const block = this.map.getBlock(this.enableArea[i]);
      if (block !== null && block.overlay !== undefined) {
        const mesh = block.overlay.get(this.depth); // 遍历范围内砖块的叠加层
        if (mesh !== undefined && mesh.visible === !state) {
          this.visible = null; // 所有砖块内只要有一块与设定的可见性不同则应为null
          return;
        }
      }
    }
    this.visible = state; // 所有砖块可见性均一致说明为全可见/不可见
  }
}


export default Overlay;
