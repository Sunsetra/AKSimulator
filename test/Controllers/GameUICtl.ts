import {
  Data,
  IconList,
  oprData,
} from '../../modules/core/MapInfo';
import { RarityColor } from '../../modules/others/constants.js';


/* 定义角色卡所需的数据接口，值均为地址字符串 */
interface CardData {
  icon: string;
  class: string;
  cost: string;
  rarity: string;
}


class GameUIController {
  private readonly unitData: oprData; // 单位名对应的单位数据

  private readonly iconData: IconList; // 图标资源数据

  private readonly oprCardNode: HTMLElement; // 底部单位选择列表节点

  constructor(data: Data) {
    this.iconData = data.materials.icons;
    this.unitData = data.units;
    this.oprCardNode = document.querySelector('#operator-card') as HTMLElement;
  }

  /**
   * 按指定的干员名称列表创建干员头像卡
   * @param oprList: 干员名称列表
   */
  addOprCard(oprList: string[]): void {
    oprList.forEach((opr) => {
      const data = this.unitData[opr];
      const cardData: CardData = {
        icon: this.iconData.operator[opr],
        class: this.iconData.class[data.class],
        cost: data.cost.toString(),
        rarity: this.iconData.rarity[data.rarity],
      };

      const oprNode = document.createElement('div');
      oprNode.setAttribute('class', 'operator');
      oprNode.dataset.class = cardData.class;
      oprNode.dataset.cost = cardData.cost;
      oprNode.dataset.name = opr;
      oprNode.style.borderBottomColor = RarityColor[Number(data.rarity)];
      oprNode.style.background = `
        url("${cardData.class}") no-repeat top left/25%,
        url("${cardData.rarity}") no-repeat bottom right/45%,
        url("${cardData.icon}") no-repeat top left/cover`;

      const costNode = document.createElement('div');
      const costText = document.createTextNode(cardData.cost);
      costNode.setAttribute('class', 'opr-cost');

      costNode.appendChild(costText);
      oprNode.appendChild(costNode);
      this.oprCardNode.appendChild(oprNode);
    });
  }
}


export default GameUIController;
