/**
 * 地图管理类
 * @author: 落日羽音
 */

import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Fog,
  Material,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
  Vector2,
  Vector3,
} from '../../node_modules/three/build/three.module.js';

import Building from '../buildings/Building.js';
import Decoration from '../buildings/Decoration.js';
import {
  BlockType,
  BlockUnit,
  OverlayType,
} from '../others/constants.js';
import {
  BlockInfoError,
  BuildingInfoError,
  ResourcesUnavailableError,
} from '../others/exceptions.js';
import {
  disposeResources,
  realPosToAbsPos,
} from '../others/utils.js';
import GameFrame from './GameFrame.js';
import {
  BlockInfo,
  BuildingInfo,
  MapInfo,
  ResourcesList,
} from './MapInfo';
import Overlay from './Overlay.js';
import Tracker from './Tracker.js';
import Unit from './Unit';


/**
 * 地图管理类，包括地图构造、地图数据获取，叠加层设置及管理
 */
class GameMap {
  readonly name: string; // 地图名称

  readonly width: number; // 地图宽度格数

  readonly height: number; // 地图高度格数

  readonly data: MapInfo; // 原始地图信息

  readonly mesh: Mesh; // 地图网格体

  overlay: Map<number, Overlay>; // 地图中的叠加层映射

  private readonly blockData: Array<BlockInfo | null>; // 砖块信息列表

  private readonly resList: ResourcesList; // 全资源列表

  readonly tracker: Tracker; // 光标位置追踪器

  private readonly frame: GameFrame; // 游戏框架

  constructor(frame: GameFrame, data: MapInfo, resList: ResourcesList) {
    this.frame = frame;
    this.data = data;
    this.resList = resList;
    this.name = data.name;
    this.width = data.mapWidth;
    this.height = data.mapHeight;

    /* 建立无建筑信息的空白地图 */
    this.blockData = new Array(this.width * this.height).fill(null);
    const blockInfo: BlockInfo[] = JSON.parse(JSON.stringify(data.blockInfo));
    blockInfo.forEach((info) => {
      const { x, z, heightAlpha } = info;
      delete info.buildingInfo;
      const index = z * this.width + x;
      const blockSize = new Vector3(BlockUnit, heightAlpha * BlockUnit, BlockUnit);
      this.blockData[index] = info;
      Object.defineProperty(this.blockData[index], 'size', { // 为砖块对象添加三维尺寸对象
        value: blockSize,
        writable: true,
        enumerable: true,
      });
    });

    /* 创建地形网格几何体 */
    {
      const positions: number[] = []; // 存放顶点坐标
      const normals: number[] = []; // 存放面法向量
      const indices: number[] = []; // 存放顶点序列索引
      const uvs: number[] = []; // 存放顶点UV信息
      const sideGroup: [number, number][] = []; // 侧面贴图顶点组信息，每个元组是一个组的[start, count]
      const faces = [
        { // 左侧
          normal: [-1, 0, 0],
          corners: [
            { pos: [0, 1, 0], uv: [0, 1] },
            { pos: [0, 0, 0], uv: [0, 0] },
            { pos: [0, 1, 1], uv: [1, 1] },
            { pos: [0, 0, 1], uv: [1, 0] },
          ],
        },
        { // 右侧
          normal: [1, 0, 0],
          corners: [
            { pos: [1, 1, 1], uv: [0, 1] },
            { pos: [1, 0, 1], uv: [0, 0] },
            { pos: [1, 1, 0], uv: [1, 1] },
            { pos: [1, 0, 0], uv: [1, 0] },
          ],
        },
        { // 上侧
          normal: [0, 0, -1],
          corners: [
            { pos: [1, 0, 0], uv: [0, 0] },
            { pos: [0, 0, 0], uv: [1, 0] },
            { pos: [1, 1, 0], uv: [0, 1] },
            { pos: [0, 1, 0], uv: [1, 1] },
          ],
        },
        { // 下侧
          normal: [0, 0, 1],
          corners: [
            { pos: [0, 0, 1], uv: [0, 0] },
            { pos: [1, 0, 1], uv: [1, 0] },
            { pos: [0, 1, 1], uv: [0, 1] },
            { pos: [1, 1, 1], uv: [1, 1] },
          ],
        },
        { // 底侧
          normal: [0, -1, 0],
          corners: [
            { pos: [1, 0, 1], uv: [1, 0] },
            { pos: [0, 0, 1], uv: [0, 0] },
            { pos: [1, 0, 0], uv: [1, 1] },
            { pos: [0, 0, 0], uv: [0, 1] },
          ],
        },
        { // 顶侧
          normal: [0, 1, 0],
          corners: [
            { pos: [0, 1, 1], uv: [1, 1] },
            { pos: [1, 1, 1], uv: [0, 1] },
            { pos: [0, 1, 0], uv: [1, 0] },
            { pos: [1, 1, 0], uv: [0, 0] },
          ],
        },
      ];

      let start = 0; // 贴图顶点组开始索引
      let count = 0; // 贴图单顶点组计数

      for (let zNum = 0; zNum < this.height; zNum += 1) { // 遍历整个地图几何
        for (let xNum = 0; xNum < this.width; xNum += 1) {
          const thisBlock = this.getBlock(xNum, zNum);
          if (thisBlock === null) { // 该处无方块时加入空元组占位
            sideGroup.push([0, 0]);
          } else { // 该处有方块（不为null）才构造几何
            const thisHeight = thisBlock.heightAlpha;

            faces.forEach(({ corners, normal }) => {
              const sideBlock = this.getBlock(xNum + normal[0], zNum + normal[2]);
              const sideHeight = sideBlock ? sideBlock.heightAlpha : 0; // 当前侧块的高度系数
              if (thisHeight - sideHeight > 0 || normal[1]) { // 当前侧面高于侧块或是上下表面
                const ndx = positions.length / 3; // 置于首次改变position数组之前
                corners.forEach(({ pos, uv }) => {
                  const x = pos[0] * BlockUnit;
                  const y = pos[1] * thisHeight * BlockUnit;
                  const z = pos[2] * BlockUnit;
                  positions.push(x + xNum * BlockUnit, y, z + zNum * BlockUnit);
                  normals.push(...normal);
                  uvs.push(...uv);
                });
                indices.push(ndx, ndx + 1, ndx + 2, ndx + 2, ndx + 1, ndx + 3);
              }
            });
            count = indices.length - 12 - start; // 侧面组顶点新增数量
            sideGroup.push([start, count]); // 加入侧面顶点数据
            start = indices.length; // 下一组顶点的开始索引
          }
        }
      }
      const mapGeometry = new BufferGeometry();
      mapGeometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
      mapGeometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
      mapGeometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
      mapGeometry.setIndex(indices);

      const materialList: Material[] = []; // 创建所需的所有砖块表面贴图材质
      const materialMap: { [matType: string]: number } = {}; // 材质类型在材质列表中的索引
      data.resources.block.forEach((type) => {
        const res = resList.block[type];
        if (res.mat && res.mat instanceof Material) {
          materialList.push(res.mat);
          materialMap[type] = materialList.length - 1;
        } else {
          throw new ResourcesUnavailableError('材质资源不存在', res);
        }
      });

      this.blockData.forEach((item, ndx) => { // 添加贴图顶点组
        if (item !== null) {
          const { texture } = item;
          const top = texture.top ? texture.top : 'topDefault';
          const side = texture.side ? texture.side : 'sideDefault';
          const bottom = texture.bottom ? texture.bottom : 'bottomDefault';
          const [s, c] = sideGroup[ndx]; // 每组的开始索引和计数

          mapGeometry.addGroup(s + c + 6, 6, materialMap[top]); // 顶面组
          mapGeometry.addGroup(s + c, 6, materialMap[bottom]); // 底面组
          if (count) { mapGeometry.addGroup(s, c, materialMap[side]); } // 侧面需要建面时添加侧面组
        }
      });

      this.mesh = new Mesh(mapGeometry, materialList);
      this.mesh.castShadow = true;
      this.mesh.receiveShadow = true;
    }

    /** 构造地图几何数据及贴图映射数据 */
    {
      const maxSize = Math.max(this.width, this.height) * BlockUnit; // 地图最长尺寸
      const centerX = (this.width * BlockUnit) / 2; // 地图X向中心
      const centerZ = (this.height * BlockUnit) / 2; // 地图Z向中心
      const {
        scene,
        camera,
        controls,
        lights,
      } = this.frame;

      /* 场景设置 */
      scene.fog = new Fog(0x0, maxSize, maxSize * 2); // 不受雾气影响的范围为1倍最长尺寸，2倍最长尺寸外隐藏
      camera.far = maxSize * 2; // 2倍最长尺寸外不显示
      camera.position.set(centerX, centerZ * 3, centerZ * 3);
      camera.updateProjectionMatrix();
      controls.target.set(centerX, 0, centerZ); // 设置摄影机朝向为地图中心

      /* 从原始数据绑定并添加建筑 */
      this.data.blockInfo.forEach((item) => {
        if (item !== null && item.buildingInfo) { // 此处有砖块有建筑
          const { x, z } = item;
          this.removeBuilding(x, z);
          this.bindBuilding(x, z, item.buildingInfo);
        }
      });

      /* 设置场景灯光 */
      {
        const {
          envIntensity,
          envColor,
          color,
          intensity,
          hour,
          phi,
        } = this.data.light;
        lights.envLight.color = new Color(envColor);
        lights.envLight.intensity = envIntensity;
        lights.sunLight.color = new Color(color);
        lights.sunLight.intensity = intensity;

        let mapHour = hour || new Date().getHours(); // 如果未指定地图时间，则获取本地时间
        if (mapHour < 6 || mapHour > 18) { // 时间为夜间时定义夜间光源
          mapHour = mapHour < 6 ? mapHour + 12 : mapHour % 12;
          lights.sunLight.intensity = 0.6;
          lights.sunLight.color.set(0xffffff);
          lights.envLight.color.set(0x5C6C7C);
        }

        const randomDeg = Math.floor(Math.random() * 360) + 1;
        const mapPhi = phi || randomDeg; // 如果未指定方位角，则使用随机方位角
        const lightRad = maxSize; // 光源半径为地图最大尺寸
        const theta = 140 - mapHour * 12; // 从地图时间计算天顶角
        const cosTheta = Math.cos(MathUtils.degToRad(theta)); // 计算光源位置
        const sinTheta = Math.sin(MathUtils.degToRad(theta));
        const cosPhi = Math.cos(MathUtils.degToRad(mapPhi));
        const sinPhi = Math.sin(MathUtils.degToRad(mapPhi));
        const lightPosX = lightRad * sinTheta * cosPhi + centerX;
        const lightPosY = lightRad * cosTheta;
        const lightPosZ = lightRad * sinTheta * sinPhi + centerZ;
        lights.sunLight.position.set(lightPosX, lightPosY, lightPosZ);
        lights.sunLight.target.position.set(centerX, 0, centerZ); // 设置光源终点
        lights.sunLight.target.updateWorldMatrix(false, true);

        lights.sunLight.castShadow = true; // 设置光源阴影
        lights.sunLight.shadow.camera.left = -maxSize / 2; // 按地图最大尺寸定义光源阴影
        lights.sunLight.shadow.camera.right = maxSize / 2;
        lights.sunLight.shadow.camera.top = maxSize / 2;
        lights.sunLight.shadow.camera.bottom = -maxSize / 2;
        lights.sunLight.shadow.camera.near = maxSize / 2;
        lights.sunLight.shadow.camera.far = maxSize * 1.5; // 阴影覆盖光源半径的球体
        lights.sunLight.shadow.bias = 0.0001;
        lights.sunLight.shadow.mapSize.set(4096, 4096);
        lights.sunLight.shadow.camera.updateProjectionMatrix();
      }

      /* 添加子对象 */
      scene.add(this.mesh);
      scene.add(lights.envLight);
      scene.add(lights.sunLight);
      scene.add(lights.sunLight.target);

      // /** 创建辅助对象，包括灯光参数控制器等 */
      // import dat from '../../node_modules/three/examples/jsm/libs/dat.gui.module.js';
      // import {
      //   DirectionalLightHelper,
      //   GridHelper,
      //   AxesHelper,
      // } from '../../node_modules/three/build/three.module.js';
      // const gui = new dat.GUI();
      // const meshFolder = gui.addFolder('网格');
      // class AxisGridHelper {
      //   constructor(element, gridSize) {
      //     const axes = new AxesHelper();
      //     axes.material.depthTest = false;
      //     axes.renderOrder = 2;
      //     element.add(axes);
      //     const grid = new GridHelper(gridSize, gridSize);
      //     grid.material.depthTest = false;
      //     grid.renderOrder = 1;
      //     element.add(grid);
      //     this.grid = grid;
      //     this.axes = axes;
      //     this.visible = false;
      //   }
      //   get visible() { return this._visible; }
      //   set visible(v) {
      //     this._visible = v;
      //     this.grid.visible = v;
      //     this.axes.visible = v;
      //   }
      // }
      // const sceneHelper = new AxisGridHelper(this.frame.scene, 300);
      // meshFolder.add(sceneHelper, 'visible').name('场景网格');
      // const helper = new DirectionalLightHelper(this.frame.lights.sunLight);
      // helper.update();
      // this.frame.scene.add(helper);
    }

    this.tracker = new Tracker(frame, this.mesh);
    this.overlay = new Map<number, Overlay>();

    /* 添加叠加层 */
    const placeLayer = this.addOverlay(OverlayType.PlaceLayer);
    placeLayer.setOverlayStyle('green');
    const attackLayer = this.addOverlay(OverlayType.AttackLayer, placeLayer);
    attackLayer.setOverlayStyle('red');
    attackLayer.setEnableArea(this.getPlaceableArea()); // 攻击范围叠加层全域有效
  }

  /**
   * 验证并获取指定位置的砖块对象
   * @param x - 砖块所在X位置
   * @param z - 砖块所在Z位置
   * @returns - 指定位置处存在砖块时返回砖块，不存在则返回null
   */
  getBlock(x: number, z: number): BlockInfo | null;

  getBlock(x: Vector2): BlockInfo | null;

  getBlock(x: number | Vector2, z?: number): BlockInfo | null {
    if (x instanceof Vector2) {
      const verifyRow = Math.floor(x.x / this.width);
      const verifyColumn = Math.floor(x.y / this.height);
      if (verifyRow || verifyColumn) { return null; }
      return this.blockData[x.y * this.width + x.x];
    }
    if (typeof z === 'number') {
      const verifyRow = Math.floor(x / this.width);
      const verifyColumn = Math.floor(z / this.height);
      if (verifyRow || verifyColumn) { return null; }
      return this.blockData[z * this.width + x];
    }
    return null;
  }

  /** 返回整个砖块信息数组 */
  getBlocks(): Array<BlockInfo | null> { return this.blockData; }

  /**
   * 获取指定可放置单位的砖块种类的位置列表
   * @param type: 砖块种类，置空时获取所有砖块位置
   */
  getPlaceableArea(type?: string): Vector2[] {
    const area: Vector2[] = [];
    this.blockData.forEach((block) => {
      if (block !== null) {
        if (type === undefined) {
          area.push(new Vector2(block.x, block.z));
        } else if (block.placeable && (type === block.blockType || type === BlockType.PlaceableBlock)) {
          area.push(new Vector2(block.x, block.z));
        }
      }
    });
    return area;
  }

  /**
   * （游戏控制类）在指定位置添加单位实例
   * @param x: 单位需添加到的X位置
   * @param z: 单位需添加到的Z位置
   * @param unit: 单位实例
   */
  addUnit(x: number, z: number, unit: Unit): void {
    const thisBlock = this.getBlock(x, z);
    if (thisBlock !== null) {
      const y = thisBlock.size.y + unit.height / 2;
      unit.setY(y);
      unit.position = new Vector2(x + 0.5, z + 0.5); // 敌人初始放置
      this.frame.scene.add(unit.mesh); // 添加单位到地图
    }
  }

  /* ---------------------------------场景建筑相关操作--------------------------------- */
  /**
   * 创建建筑实例并向地图添加建筑绑定
   * 跨距建筑：范围中所有砖块均有buildingInfo信息，但只有主块有inst实例
   * @param x: 绑定目标X位置
   * @param z: 绑定目标Z位置
   * @param info: 绑定目标建筑信息
   */
  bindBuilding(x: number, z: number, info: BuildingInfo): void {
    /* 目标位置无砖块，则返回放置失败 */
    const block = this.getBlock(x, z);
    if (block === null) { return; }

    /* 目标建筑未创建实体则抛出异常 */
    const { entity } = this.resList.model[info.desc];
    if (entity === undefined) {
      throw new ResourcesUnavailableError('目标建筑实体未创建', this.resList.model[info.desc]);
    }

    const xSpan = info.xSpan ? info.xSpan : 1;
    const zSpan = info.zSpan ? info.zSpan : 1;
    /* 检查跨距建筑范围内的砖块是否有buildingInfo，有则返回放置失败 */
    for (let xNum = 0; xNum < xSpan; xNum += 1) {
      for (let zNum = 0; zNum < zSpan; zNum += 1) {
        const thisBlock = this.getBlock(xNum + x, zNum + z);
        if (thisBlock !== null && Object.prototype.hasOwnProperty.call(thisBlock, 'buildingInfo')) {
          console.warn(`无法绑定建筑：(${zNum}, ${xNum})处已存在建筑导致冲突`);
          return; // 不能合并，否则新建的buildingInfo会污染该跨距区域
        }
      }
    }
    /* 查找跨距建筑范围内的最高砖块，并添加建筑信息 */
    let highestAlpha = block.heightAlpha; // 砖块的最高Y轴尺寸系数
    for (let xNum = 0; xNum < xSpan; xNum += 1) {
      for (let zNum = 0; zNum < zSpan; zNum += 1) {
        const thisBlock = this.getBlock(xNum + x, zNum + z);
        if (thisBlock !== null) {
          const { heightAlpha } = thisBlock; // 寻找最高块的高度
          highestAlpha = heightAlpha > highestAlpha ? heightAlpha : highestAlpha;
          Object.defineProperty(thisBlock, 'buildingInfo', {
            value: info,
            configurable: true,
            enumerable: true,
          }); // 范围内砖块均定义建筑信息
        }
      }
    }
    /* 创建建筑实体并添加到当前位置的建筑信息实例，定义主建筑位置 */
    let building: Building;
    if (info.desc === 'destination' || info.desc === 'entry') {
      building = new Building(entity.clone(), info);
    } else {
      building = new Decoration(entity.clone(), info);
    }
    Object.defineProperties(block.buildingInfo, {
      inst: {
        value: building,
        configurable: true,
        enumerable: true,
      },
      x: {
        value: x,
        configurable: true,
        enumerable: true,
      },
      z: {
        value: z,
        configurable: true,
        enumerable: true,
      },
    });

    /* 放置建筑 */
    const posX = (x + building.xSpan / 2) * block.size.x;
    const posY = building.size.y / 2 + highestAlpha * BlockUnit - 0.01; // 跨距建筑以最高砖块为准
    const posZ = (z + building.zSpan / 2) * block.size.z;
    building.mesh.position.set(posX, posY, posZ);
    this.frame.scene.add(building.mesh);
  }

  /**
   * 从指定的行/列移除建筑，无需手动从scene中移除实例
   * @param xPos: 要移除的建筑X位置
   * @param zPos: 要移除的建筑Z位置
   */
  removeBuilding(xPos: number, zPos: number): void {
    /* 目标砖块不存在，或目标砖块上没有buildingInfo属性直接返回 */
    const block = this.getBlock(xPos, zPos);
    if (block === null || block.buildingInfo === undefined) { return; }

    /* 取目标砖块上的建筑信息，遍历其跨距，废弃主块的实例并删除跨距内的buildingInfo */
    const { buildingInfo } = block;
    const {
      x,
      z,
      xSpan,
      zSpan,
    } = buildingInfo;
    const mainBlock = this.getBlock(x, z);
    if (mainBlock === null) {
      throw new BuildingInfoError('指定的主建筑位置无效', buildingInfo);
    } else {
      if (mainBlock.buildingInfo !== undefined && mainBlock.buildingInfo.inst !== undefined) {
        disposeResources(mainBlock.buildingInfo.inst.mesh);
      } else {
        throw new BlockInfoError('主砖块不存在建筑信息或建筑信息错误', mainBlock);
      }

      if (xSpan !== undefined && zSpan !== undefined) {
        for (let xNum = 0; xNum < xSpan; xNum += 1) { // 从主建筑开始，删除所在跨距中的buildingInfo
          for (let zNum = 0; zNum < zSpan; zNum += 1) {
            const thisBlock = this.getBlock(x + xNum, z + zNum);
            if (thisBlock !== null) { delete thisBlock.buildingInfo; }
          }
        }
      }
    }
  }

  /* ---------------------------------叠加层相关操作--------------------------------- */
  /**
   * 向地图中添加叠加层，范围整个地图，返回添加的叠加层
   * @param depth: 叠加层高度
   * @param parent: 叠加层的父级
   */
  addOverlay(depth: OverlayType, parent?: Overlay): Overlay {
    const overlay = new Overlay(this, depth, parent);
    this.getBlocks().forEach((block) => {
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
        const mesh = block.overlay.get(depth); // 取砖块上现有的叠加层
        if (mesh !== undefined) { disposeResources(mesh); } // 如果砖块上已有该层，则废弃先添加的叠加层
        block.overlay.set(depth, proto); // 同深度叠加层，后添加的替换先添加的
        this.frame.scene.add(proto);
      }
    });
    this.overlay.set(depth, overlay);
    return overlay;
  }

  /**
   * 获取指定高度的叠加层对象（用OverlayType获取的叠加层不可能不存在）
   * @param depth: 目标叠加层高度
   */
  getOverlay(depth: OverlayType): Overlay {
    return this.overlay.get(depth) as Overlay;
  }

  /**
   * 隐藏指定叠加层，参数为空时隐藏所有叠加层
   * @param depth 要隐藏的叠加层类型
   */
  hideOverlay(depth?: OverlayType): void {
    if (depth === undefined) {
      this.overlay.forEach((layer) => { layer.hide(); });
    } else {
      const layer = this.overlay.get(depth);
      if (layer !== undefined) { layer.hide(); }
    }
  }

  /**
   * 追踪光标在指定叠加层上的位置
   * @param layer: 目标叠加层
   * @param area: 相对于中心坐标的Vector2偏移量数组
   */
  trackOverlay(layer: Overlay, area: Vector2[]): void {
    if (this.tracker.enabled) {
      if (this.tracker.pickPos === null) {
        if (layer.visibility !== false) { layer.hide(); } // 光标未在目标对象上且当前叠加层未完全隐藏时隐藏叠加层
        this.tracker.lastPos = null;
      } else {
        const absPos = realPosToAbsPos(this.tracker.pickPos, true); // 当前位置的抽象坐标
        if (!this.tracker.lastPos || !absPos.equals(this.tracker.lastPos)) {
          layer.hide(); // 当前位置非前次记录位置时，首先全隐藏当前叠加层

          if (((): boolean => {
            if (layer.parent !== undefined) { return layer.parent.has(absPos); }
            return true;
          })()) { // 检查当前位置是否在父范围内
            area.forEach((point) => {
              const newPos = new Vector2().addVectors(absPos, point);
              layer.setOverlayVisibility(newPos, true);
            });
          }
          this.tracker.lastPos = absPos;
        }
      }
    }
  }
}


export default GameMap;
