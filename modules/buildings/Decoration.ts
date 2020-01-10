/**
 * 装饰建筑类
 * @author: 落日羽音
 */

import {
  FrontSide,
  Mesh,
} from '../../node_modules/three/build/three.module.js';

import { BuildingInfo } from '../core/MapInfo';
import Building from './Building.js';


class Decoration extends Building {
  constructor(mesh: Mesh, info: BuildingInfo) {
    super(mesh, info);
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((mat) => { mat.side = FrontSide; });
    } else { mesh.material.side = FrontSide; }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }
}


export default Decoration;
