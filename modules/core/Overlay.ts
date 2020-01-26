/**
 * 叠加层类：创建并管理浮于地表的叠加层的相关属性及行为
 * @author: 落日羽音
 */

import {
  Color,
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
  Scene,
  Texture,
  Vector2,
} from '../../node_modules/three/build/three.module.js';

import { BlockUnit } from '../others/constants.js';
import { disposeResources } from '../others/utils.js';
import GameMap from './GameMap.js';
import { BlockInfo } from './MapInfo';


class Overlay {
  readonly area: Vector2[]; // 当前叠加层覆盖区域

  readonly parent: Overlay | undefined; // 父叠加层对象

  private readonly map: GameMap;

  private readonly depth: number; // 叠加层深度，0值为距地面高0.01位置，依次增加0.01

  private visible: boolean | null; // 当前叠加层的可见性，当且仅当所有均不可见时值为false，部分隐藏时值为null

  constructor(scene: Scene, map: GameMap, depth: number, area?: Vector2[], parent?: Overlay) {
    this.map = map;
    this.depth = depth;
    this.parent = parent;
    this.visible = false;

    /* 当叠加层区域参数缺省/undefined时，表示叠加层覆盖整个地图区域 */
    if (area === undefined) {
      this.area = [];
      map.getBlocks().forEach((block) => {
        if (block !== null) { this.area.push(new Vector2(block.x, block.z)); }
      });
    } else { this.area = area; }

    this.area.forEach((pos) => {
      const block = map.getBlock(pos);
      if (block !== null) {
        const geometry = new PlaneBufferGeometry(BlockUnit, BlockUnit);
        const material = new MeshBasicMaterial({
          transparent: true,
          opacity: 0.4,
        });
        const proto = new Mesh(geometry, material); // 创建叠加层原型

        const posX = block.size.x * (block.x + 0.5);
        const posY = block.size.y + (depth + 1) * 0.01;
        const posZ = block.size.z * (block.z + 0.5);
        proto.position.set(posX, posY, posZ);
        proto.rotateX(-Math.PI / 2);
        proto.visible = false; // 新创建的叠加层默认隐藏显示

        if (block.overlay === undefined) { block.overlay = new Map(); }
        const mesh = block.overlay.get(depth);
        if (mesh === undefined) {
          block.overlay.set(depth, proto); // 同深度叠加层，后添加的替换先添加的
        } else {
          disposeResources(mesh); // 废弃先添加的叠加层
        }
        scene.add(proto);
      }
    });
  }

  /** 获取当前叠加层的可见性 */
  get visibility(): boolean | null {
    return this.visible;
  }

  /**
   * 设置叠加层样式
   * @param map: 提供叠加层贴图或纯色叠加层
   */
  setOverlayStyle(map: Texture | Color | string | number): void {
    this.area.forEach((pos) => {
      const block = this.map.getBlock(pos);
      if (block !== null && block.overlay !== undefined) {
        const mesh = block.overlay.get(this.depth); // 获取当前砖块上的叠加层
        if (mesh !== undefined) {
          if (map instanceof Texture) {
            (mesh.material as MeshBasicMaterial).map = map;
          } else {
            (mesh.material as MeshBasicMaterial).color = new Color(map);
          }
        }
      }
    });
  }

  /**
   * 检查指定位置是否位于当前叠加层的范围内
   * @param pos: 需检查的位置坐标
   */
  has(pos: Vector2): boolean {
    for (let i = 0; i < this.area.length; i += 1) {
      if (this.area[i].equals(pos)) { return true; }
    }
    return false;
  }

  /** 将范围内所有叠加层设置为显示 */
  show(): void {
    if (!this.visible) { // 仅当全隐藏或部分隐藏时显示
      for (let i = 0; i < this.area.length; i += 1) {
        const block = this.map.getBlock(this.area[i]);
        if (block !== null && block.overlay !== undefined) {
          const mesh = block.overlay.get(this.depth); // 遍历范围内砖块的叠加层
          if (mesh !== undefined) { mesh.visible = true; }
        }
      }
      this.visible = true;
    }
  }

  /** 将范围内所有叠加层设置为隐藏 */
  hide(): void {
    if (this.visible !== false) { // 仅当全显示或部分隐藏时隐藏
      for (let i = 0; i < this.area.length; i += 1) {
        const block = this.map.getBlock(this.area[i]);
        if (block !== null && block.overlay !== undefined) {
          const mesh = block.overlay.get(this.depth); // 遍历范围内砖块的叠加层
          if (mesh !== undefined) { mesh.visible = false; }
        }
      }
      this.visible = false;
    }
  }

  /**
   * 设定指定位置的叠加层的可见性
   * @param a: 目标叠加层所在的砖块
   * @param b: 新可见性
   */
  setOverlayVisibility(a: Vector2, b: boolean): void;
  /**
   * 设定指定位置的叠加层的可见性
   * @param a: 叠加层所在X位置
   * @param b: 叠加层所在Z位置
   * @param c: 新可见性
   */
  setOverlayVisibility(a: number, b: number, c: boolean): void;
  setOverlayVisibility(a: Vector2 | number, b: number | boolean, c?: boolean): void {
    /* 获取砖块实例 */
    let block: BlockInfo | null;
    if (typeof a === 'number') {
      if (typeof b === 'number') {
        block = this.map.getBlock(a, b);
      } else { block = this.map.getBlock(a, 0); }
    } else { block = this.map.getBlock(a); }

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

  /**
   * 设置当前叠加层对象的可见性属性
   * 所有砖块可见为true，所有不可见为false，部分可见为null
   * @param state: 新可见性
   */
  private updateVisibility(state: boolean): void {
    for (let i = 0; i < this.area.length; i += 1) {
      const block = this.map.getBlock(this.area[i]);
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
