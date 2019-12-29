/**
 * 地图管理类
 * @author: 落日羽音
 */

import GameFrame from '../../modules/core/GameFrame.js';
import { ResourcesList } from '../../modules/loaders/ResourceLoader.js';

import { BlockInfo, BuildingInfo, LightInfo, MapInfo, WaveInfo } from '../../modules/MapInfo.js';
import { disposeResources } from '../../modules/utils.js';

import { BufferAttribute } from '../../node_modules/three/src/core/BufferAttribute.js';
import { BufferGeometry } from '../../node_modules/three/src/core/BufferGeometry.js';
import { Material } from '../../node_modules/three/src/materials/Material.js';
import { Color } from '../../node_modules/three/src/math/Color.js';
import { _Math } from '../../node_modules/three/src/math/Math.js';
import { Vector3 } from '../../node_modules/three/src/math/Vector3.js';
import { Mesh } from '../../node_modules/three/src/objects/Mesh.js';
import { Fog } from '../../node_modules/three/src/scenes/Fog.js';
import Building from '../buildings/Building.js';
import { BlockUnit } from '../constant.js';


class Map {
  readonly name: string; // 地图名称

  readonly width: number; // 地图宽度格数

  readonly height: number; // 地图高度格数

  readonly enemyNum: number; // 敌人总数量

  readonly waves: WaveInfo[]; // 原始波次信息

  private readonly blockData: Array<BlockInfo | null>; // 砖块信息列表

  private readonly resList: ResourcesList; // 全资源列表

  private readonly light: LightInfo; // 光源信息

  private readonly mesh: Mesh; // 地图网格体

  constructor(data: MapInfo, resList: ResourcesList) {
    this.name = data.name;
    this.width = data.mapWidth;
    this.height = data.mapHeight;
    this.enemyNum = data.enemyNum;
    this.light = data.light;
    this.waves = data.waves;
    this.resList = resList;

    this.blockData = new Array(this.width * this.height).fill(null);
    data.blockInfo.forEach((info) => { // 建立砖块数据
      const { row, column, heightAlpha } = info;
      const index = row * this.width + column;
      const blockSize = new Vector3(BlockUnit, heightAlpha * BlockUnit, BlockUnit);
      this.blockData[index] = info;
      Object.defineProperty(this.blockData[index], 'size', { // 为砖块对象添加三维尺寸对象
        value: blockSize,
        writable: true,
        enumerable: true,
      });
    });

    /* 创建地形网格几何体 */
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

    for (let row = 0; row < this.height; row += 1) { // 遍历整个地图几何
      for (let column = 0; column < this.width; column += 1) {
        const thisBlock = this.getBlock(row, column);
        if (thisBlock) { // 该处有方块（不为null）才构造几何
          const thisHeight = thisBlock.heightAlpha;

          faces.forEach(({ corners, normal }) => {
            const sideBlock = this.getBlock(row + normal[2], column + normal[0]);
            const sideHeight = sideBlock ? sideBlock.heightAlpha : 0; // 当前侧块的高度系数
            if (thisHeight - sideHeight > 0 || normal[1]) { // 当前侧面高于侧块或是上下表面
              const ndx = positions.length / 3; // 置于首次改变position数组之前
              corners.forEach(({ pos, uv }) => {
                const x = pos[0] * BlockUnit;
                const y = pos[1] * thisHeight * BlockUnit;
                const z = pos[2] * BlockUnit;
                positions.push(x + column * BlockUnit, y, z + row * BlockUnit);
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
      }
    });

    this.blockData.forEach((item, ndx) => { // 添加贴图顶点组
      if (item !== null) {
        const { texture } = item;
        const top = texture.top ? texture.top : 'topDefault';
        const side = texture.side ? texture.side : 'sideDefault';
        const bottom = texture.bottom ? texture.bottom : 'bottomDefault';
        const [start, count] = sideGroup[ndx];

        mapGeometry.addGroup(start + count + 6, 6, materialMap[top]); // 顶面组
        mapGeometry.addGroup(start + count, 6, materialMap[bottom]); // 底面组
        if (count) { mapGeometry.addGroup(start, count, materialMap[side]); } // 侧面需要建面时添加侧面组
      }
    });

    this.mesh = new Mesh(mapGeometry, materialList);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  /**
   * 验证并获取指定位置的砖块对象
   * @param row - 砖块所在行
   * @param column - 砖块所在列
   * @returns - 指定位置处存在砖块时返回砖块，不存在则返回null
   */
  getBlock(row: number, column: number): BlockInfo | null {
    const verifyRow = Math.floor(row / this.height);
    const verifyColumn = Math.floor(column / this.width);
    if (verifyRow || verifyColumn) { return null; }
    return this.blockData[row * this.width + column];
  }

  /**
   * 创建建筑实例并向地图添加/替换建筑绑定，并返回绑定后的建筑实例
   * @param row: 绑定目标行数
   * @param column: 绑定目标列数
   * @param info: 绑定目标建筑信息
   */
  bindBuilding(row: number, column: number, info: BuildingInfo): Building | null {
    const block = this.getBlock(row, column); // 目标位置原砖块
    if (!block) { return null; } // 检查目标位置是否有砖块

    /* 原砖块上有建筑信息，则废弃原建筑的inst实例再用新建筑信息覆盖 */
    if (block.buildingInfo && block.buildingInfo.inst) { // TODO 未考虑跨距建筑
      disposeResources(block.buildingInfo.inst.mesh) // TODO: 在砖块不等高时不报错，而是以范围内最高砖块进行放置
    }
    block.buildingInfo = info;

    const { entity } = this.resList.model[info.desc];
    if (entity === undefined) {
      return null;
    } else {
      const building = new Building(entity.clone(), info);
      Object.defineProperty(block.buildingInfo, 'inst', {
        value: building,
        configurable: true,
        enumerable: true,
      });

      if (block.size !== undefined) {
        const x = (column + building.colSpan / 2) * block.size.x;
        const y = building.size.y / 2 + block.size.y - 0.01;
        const z = (row + building.rowSpan / 2) * block.size.z;
        building.mesh.position.set(x, y, z);
      }

      return building;
    }
  }

  /**
   * 构造地图几何数据及贴图映射数据
   * @param frame: 框架对象
   */
  createMap(frame: GameFrame): void {
    const maxSize = Math.max(this.width, this.height) * BlockUnit; // 地图最长尺寸
    const centerX = (this.width * BlockUnit) / 2; // 地图X向中心
    const centerZ = (this.height * BlockUnit) / 2; // 地图Z向中心

    /* 场景设置 */
    frame.scene.fog = new Fog(0x0, maxSize, maxSize * 2); // 不受雾气影响的范围为1倍最长尺寸，2倍最长尺寸外隐藏
    frame.camera.far = maxSize * 2; // 2倍最长尺寸外不显示
    frame.camera.position.set(centerX, centerZ * 3, centerZ * 3);
    frame.camera.updateProjectionMatrix();
    frame.controls.target.set(centerX, 0, centerZ); // 设置摄影机朝向为地图中心

    /* 绑定并添加建筑 */
    this.blockData.forEach((item) => {
      if (item !== null && item.buildingInfo) { // 此处有砖块有建筑
        const { row, column, buildingInfo } = item;
        const building = this.bindBuilding(row, column, buildingInfo);
        if (building !== null) { frame.scene.add(building.mesh); }
      }
    });

    /* 设置灯光 */
    const {
      envIntensity,
      envColor,
      color,
      intensity,
      hour,
      phi,
    } = this.light;
    frame.lights.envLight.color = new Color(envColor);
    frame.lights.envLight.intensity = envIntensity;
    frame.lights.sunLight.color = new Color(color);
    frame.lights.sunLight.intensity = intensity;

    let mapHour = hour ? hour : new Date().getHours(); // 如果未指定地图时间，则获取本地时间
    if (mapHour < 6 || mapHour > 18) { // 时间为夜间时定义夜间光源
      mapHour = mapHour < 6 ? mapHour + 12 : mapHour % 12;
      frame.lights.sunLight.intensity = 0.6;
      frame.lights.sunLight.color.set(0xffffff);
      frame.lights.envLight.color.set(0x5C6C7C);
    }

    const randomDeg = Math.floor(Math.random() * 360) + 1;
    const mapPhi = phi ? phi : randomDeg; // 如果未指定方位角，则使用随机方位角
    const lightRad = maxSize; // 光源半径为地图最大尺寸
    const theta = 140 - mapHour * 12; // 从地图时间计算天顶角
    const cosTheta = Math.cos(_Math.degToRad(theta)); // 计算光源位置
    const sinTheta = Math.sin(_Math.degToRad(theta));
    const cosPhi = Math.cos(_Math.degToRad(mapPhi));
    const sinPhi = Math.sin(_Math.degToRad(mapPhi));
    const lightPosX = lightRad * sinTheta * cosPhi + centerX;
    const lightPosY = lightRad * cosTheta;
    const lightPosZ = lightRad * sinTheta * sinPhi + centerZ;
    frame.lights.sunLight.position.set(lightPosX, lightPosY, lightPosZ);
    frame.lights.sunLight.target.position.set(centerX, 0, centerZ); // 设置光源终点
    frame.lights.sunLight.target.updateWorldMatrix(false, true);

    frame.lights.sunLight.castShadow = true; // 设置光源阴影
    frame.lights.sunLight.shadow.camera.left = -maxSize / 2; // 按地图最大尺寸定义光源阴影
    frame.lights.sunLight.shadow.camera.right = maxSize / 2;
    frame.lights.sunLight.shadow.camera.top = maxSize / 2;
    frame.lights.sunLight.shadow.camera.bottom = -maxSize / 2;
    frame.lights.sunLight.shadow.camera.near = maxSize / 2;
    frame.lights.sunLight.shadow.camera.far = maxSize * 1.5; // 阴影覆盖光源半径的球体
    frame.lights.sunLight.shadow.bias = 0.0001;
    frame.lights.sunLight.shadow.mapSize.set(4096, 4096);
    frame.lights.sunLight.shadow.camera.updateProjectionMatrix();

    /* 添加子对象 */
    frame.scene.add(this.mesh);
    frame.scene.add(frame.lights.envLight);
    frame.scene.add(frame.lights.sunLight);
    frame.scene.add(frame.lights.sunLight.target);

    // /** 创建辅助对象，包括灯光参数控制器等 */
    // const gui = new dat.GUI();
    // const meshFolder = gui.addFolder('网格');
    //
    // class AxisGridHelper {
    //   constructor(element, gridSize) {
    //     const axes = new THREE.AxesHelper();
    //     axes.material.depthTest = false;
    //     axes.renderOrder = 2;
    //     element.add(axes);
    //
    //     const grid = new THREE.GridHelper(gridSize, gridSize);
    //     grid.material.depthTest = false;
    //     grid.renderOrder = 1;
    //     element.add(grid);
    //
    //     this.grid = grid;
    //     this.axes = axes;
    //     this.visible = false;
    //   }
    //
    //   get visible() { return this._visible; }
    //
    //   set visible(v) {
    //     this._visible = v;
    //     this.grid.visible = v;
    //     this.axes.visible = v;
    //   }
    // }
    // const sceneHelper = new AxisGridHelper(frame.scene, 300);
    // meshFolder.add(sceneHelper, 'visible').name('场景网格');
    // const helper = new THREE.DirectionalLightHelper(frame.lights.sunLight);
    // helper.update();
    // frame.scene.add(helper);
  }
}

export default Map;
