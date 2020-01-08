/**
 * 敌方单位类集合，从Enemies对象实例化敌方单位
 * @author: 落日羽音
 */

import { Mesh } from '../../node_modules/three/src/objects/Mesh.js';
import Enemy from './Enemy.js';
import Saber from './Saber.js';
import Slime from './Slime.js';


/* 定义字典值的类的构造函数的接口 */
interface ClassList {
  new(type: Mesh): Enemy;
}


/* 实质上是用字符串索引了类的构造函数 */
const Enemies: { [enemyType: string]: ClassList } = {
  slime: Slime,
  saber: Saber,
};

export default Enemies;
