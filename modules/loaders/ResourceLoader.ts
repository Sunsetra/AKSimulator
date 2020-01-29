/**
 * 地图所需资源加载器
 * @author: 落日羽音
 */

import {
  BoxBufferGeometry,
  DoubleSide,
  LoadingManager,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PlaneBufferGeometry,
  sRGBEncoding,
  TextureLoader,
} from '../../node_modules/three/build/three.module.js';

import { GLTFLoader } from '../../node_modules/three/examples/jsm/loaders/GLTFLoader.js';

import {
  Data,
  Resource,
  ResourceInfo,
  ResourcesList,
} from '../core/MapInfo';
import { BlockUnit } from '../others/constants.js';
import { LoadingError } from '../others/exceptions.js';


class ResourceLoader {
  resList: ResourcesList; // 总资源列表

  mapResList: ResourceInfo | undefined; // 地图所需资源列表

  onLoad?: (resList: Data) => void;

  onProgress?: (url: string, loaded: number, total: number) => void;

  onError?: (url: string) => void;

  private loadingFlag: boolean; // 加载标识位，进行了加载动作时为true

  private readonly loadManager: LoadingManager;

  private readonly gltfLoader: GLTFLoader;

  private readonly texLoader: TextureLoader;

  constructor(data: Data,
              onLoad?: (resList: Data) => void,
              onProgress?: (url: string, loaded: number, total: number) => void,
              onError?: (url: string) => void) {
    this.resList = data.materials.resources;
    this.onLoad = onLoad;
    this.onProgress = onProgress;
    this.onError = onError;

    this.loadManager = new LoadingManager((): void => {
      if (this.mapResList === undefined) {
        throw new LoadingError('地图资源信息未加载或加载错误');
      } else {
        this.createGeometry(this.mapResList);
      }
      if (this.onLoad !== undefined) { this.onLoad(data); }
    }, onProgress, onError);
    this.texLoader = new TextureLoader(this.loadManager);
    this.gltfLoader = new GLTFLoader(this.loadManager);
    this.loadingFlag = false;
  }

  /**
   * 从总资源字典中加载地图信息中需要的资源并创建实体
   * @param mapRes: 地图信息中所需的资源列表
   */
  load(mapRes: ResourceInfo): void {
    this.mapResList = mapRes;

    /* 加载进出点及干员贴图 */
    ['EDPoint', 'operator'].forEach((type) => {
      Object.values(this.resList[type]).forEach((texRes) => {
        this.loadTexture(texRes);
      });
    });

    /* 加载砖块及敌人贴图 */
    ['block', 'enemy'].forEach((category) => {
      mapRes[category].forEach((texType: string) => {
        const thisRes = this.resList[category][texType];
        this.loadTexture(thisRes);
      });
    });

    /* 加载建筑模型 */
    mapRes.model.forEach((modelType) => {
      const thisRes = this.resList.model[modelType];
      this.loadModel(thisRes);
    });

    if (!this.loadingFlag) { this.loadManager.onLoad(); } // 未实际加载时手动调用加载完成回调
  }

  /**
   * 构建资源实体，包括但不限于材质，几何体
   * @param res: 地图中所需要的资源信息
   */
  private createGeometry(res: ResourceInfo): void {
    /**
     * 从资源对象创建敌人/干员模型，包含贴图、几何体、实体资源。
     * @param unitRes: 需完善的资源对象
     */
    const createUnitRes = (unitRes: Resource): void => {
      if (!Object.prototype.hasOwnProperty.call(unitRes, 'mat') && unitRes.tex) { // tex属性一定存在
        const material = new MeshBasicMaterial({
          alphaTest: 0.6,
          map: unitRes.tex,
          side: DoubleSide,
          transparent: true,
        });
        Object.defineProperty(unitRes, 'mat', { value: material });

        const { width, height } = unitRes.tex.image;
        const geometry = new PlaneBufferGeometry(width, height);
        Object.defineProperty(unitRes, 'geo', { value: geometry });

        const mesh = new Mesh(geometry, material);
        Object.defineProperty(unitRes, 'entity', { value: mesh });
      }
    };

    /* 构建敌方单位材质及实体 */
    res.enemy.forEach((name) => {
      const texRes = this.resList.enemy[name];
      createUnitRes(texRes);
    });

    /* 构建干员单位材质及实体 */
    Object.values(this.resList.operator).forEach((opRes) => { createUnitRes(opRes); });

    /* 构建ED点的材质 */
    Object.values(this.resList.EDPoint).forEach((edRes) => {
      if (!Object.prototype.hasOwnProperty.call(edRes, 'mat')) {
        const material = new MeshBasicMaterial({
          depthWrite: false,
          map: edRes.tex,
          side: DoubleSide,
          transparent: true,
        });
        Object.defineProperty(edRes, 'mat', { value: material });
      }
    });

    /* 构建ED点的几何体 */
    if (!((): boolean => {
      let integrity = true;
      ['destination', 'entry'].forEach((type) => {
        integrity = integrity && Object.prototype.hasOwnProperty.call(this.resList.model[type], 'geo');
        integrity = integrity && Object.prototype.hasOwnProperty.call(this.resList.model[type], 'mat');
        integrity = integrity && Object.prototype.hasOwnProperty.call(this.resList.model[type], 'entity');
      }); // 检查ED点资源对象的属性是否完备
      return integrity;
    })()) { // 若EDPoint无需重新定义则跳过
      const {
        destTop, destSide, entryTop, entrySide,
      } = this.resList.EDPoint;
      /* EDPoint中加载的材质一定不是数组 */
      const destTopMat = (destTop.mat ? destTop.mat : new Material()) as Material;
      const destSideMat = (destSide.mat ? destSide.mat : new Material()) as Material;
      const entryTopMat = (entryTop.mat ? entryTop.mat : new Material()) as Material;
      const entrySideMat = (entrySide.mat ? entrySide.mat : new Material()) as Material;
      const destMat = [destSideMat, destSideMat, destTopMat, destSideMat, destSideMat, destSideMat];
      const entryMat = [entrySideMat, entrySideMat, entryTopMat, entrySideMat, entrySideMat, entrySideMat];

      const geometry = new BoxBufferGeometry(BlockUnit, BlockUnit, BlockUnit);
      const destMesh = new Mesh(geometry, destMat);
      const entryMesh = new Mesh(geometry, entryMat);

      Object.defineProperties(this.resList.model.destination, {
        geo: { value: geometry },
        mat: { value: destMat },
        entity: { value: destMesh },
      });
      Object.defineProperties(this.resList.model.entry, {
        geo: { value: geometry },
        mat: { value: entryMat },
        entity: { value: entryMesh },
      });
    }

    /* 构建砖块材质 */
    res.block.forEach((texType) => {
      const texRes = this.resList.block[texType];
      if (!Object.prototype.hasOwnProperty.call(texRes, 'mat')) {
        const material = new MeshPhysicalMaterial({
          metalness: 0.1,
          roughness: 0.6,
          map: texRes.tex,
        });
        Object.defineProperty(texRes, 'mat', { value: material });
      }
    });
  }

  /**
   * 加载源资源对象的贴图
   * 异步加载，不可用返回值的形式
   * @param res: 贴图源资源对象
   */
  private loadTexture(res: Resource): void {
    if (!Object.prototype.hasOwnProperty.call(res, 'tex')) { // 若已有已加载的贴图则跳过加载
      const texture = this.texLoader.load(res.url);
      texture.encoding = sRGBEncoding;
      texture.anisotropy = 16;
      Object.defineProperty(res, 'tex', { value: texture });
      this.loadingFlag = true;
    }
  }

  /**
   * 加载源资源对象的GLTF模型
   * 异步加载，不可用返回值的形式
   * @param res: 模型源资源对象
   */
  private loadModel(res: Resource): void {
    if (!Object.prototype.hasOwnProperty.call(res, 'entity')) { // 若已有已加载的模型则跳过加载
      this.gltfLoader.load(res.url, (gltf) => {
        const model = gltf.scene.children[0];
        Object.defineProperty(res, 'entity', { value: model });
        this.loadingFlag = true;
      });
    }
  }
}


export default ResourceLoader;
