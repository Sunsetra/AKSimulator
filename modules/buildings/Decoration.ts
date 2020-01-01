import { FrontSide } from '../../node_modules/three/src/constants.js';
import { Mesh } from '../../node_modules/three/src/objects/Mesh.js';
import { BuildingInfo } from '../MapInfo';
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
