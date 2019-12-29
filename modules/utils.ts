/**
 * 工具函数集
 * @author: 落日羽音
 */

import { WebGL2Available, WebGLAvailable, WebGLUnavailable } from '../modules/constant.js';
import { WEBGL } from '../node_modules/three/examples/jsm/WebGL.js';
import { BufferGeometry } from '../node_modules/three/src/core/BufferGeometry.js';

import { Geometry } from '../node_modules/three/src/core/Geometry.js';
import { Object3D } from '../node_modules/three/src/core/Object3D.js';
import { Material } from '../node_modules/three/src/materials/Material.js';
import { Mesh } from '../node_modules/three/src/objects/Mesh.js';
import { Texture } from '../node_modules/three/src/textures/Texture.js';


/**
 * 检测webgl可用性
 * @return: 返回值表示当前环境中webgl的可用性及支持的版本
 */
function checkWebGLVersion(): number {
  if (WEBGL.isWebGLAvailable()) {
    return WEBGL.isWebGL2Available() ? WebGL2Available : WebGLAvailable;
  } else {
    return WebGLUnavailable;
  }
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

export { checkWebGLVersion, disposeResources };
