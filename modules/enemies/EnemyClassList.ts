import { Mesh } from '../../node_modules/three/src/objects/Mesh.js';
import Unit from '../core/Unit.js';
import Saber from './Saber.js';
import Slime from './Slime.js';


/* 定义字典值的类的构造函数的接口 */
interface ClassList {
  new(type: Mesh): Unit;
}


/* 实质上是用字符串索引了类的构造函数 */
const Enemies: { [enemyType: string]: ClassList } = {
  slime: Slime,
  saber: Saber,
};

export default Enemies;
