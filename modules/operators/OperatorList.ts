/**
 * 干员类集合，从Operators对象实例化干员
 * @author: 落日羽音
 */

import { Mesh } from '../../node_modules/three/build/three.module.js';
import Haze from './Haze.js';
import Operator from './Operator.js';


/* 定义字典值的类的构造函数的接口 */
interface ClassList {
  new(type: Mesh, hp: number): Operator;
}


/* 实质上是用字符串索引了类的构造函数 */
const Operators: { [oprType: string]: ClassList } = {
  haze: Haze,
};

export default Operators;
