/* WebGL可用性常量 */
export enum WebGLAvailability {
  Unavailable,
  Available,
  WebGL2Available,
}


/* 砖块类型常量 */
export enum BlockType {
  PlaceableBlock = 'ALL',
  BasicBlock = 'MELEE',
  HighBlock = 'RANGED',
}


/* 单位类型常量定义 */
// export enum UnitType {
//   Enemy = 'ENEMY',
//   Operator = 'OPERATOR',
// }


/* 单位放置类型定义 */
export enum PositionType {
  Melee = 'MELEE',
  Ranged = 'RANGED',
  All = 'ALL',
}


/* 叠加层常量 */
export enum OverlayType {
  PlaceLayer,
  AttackLayer,
}


/* 稀有度颜色常量定义 */
export enum RarityColor {
  White = 1,
  GreenYellow,
  DeepSkyBlue,
  MediumSlateBlue,
  Gold,
  Orange,
}


/* 单位职业常量定义 */
export enum Profession {
  Warrior = 'WARRIOR',
  Caster = 'CASTER',
  Pioneer = 'PIONEER',
  Medic = 'MEDIC',
  Tank = 'TANK',
  Sniper = 'SNIPER',
  Support = 'SUPPORT',
  Special = 'SPECIAL',
  Token = 'TOKEN',
  Trap = 'TRAP',
}


/* 游戏状态常量定义 */
export enum GameStatus {
  Standby = 'STANDBY',
  Victory = 'VICTORY',
  Defeat = 'DEFEAT',
  Running = 'RUNNING',
}


export const BlockUnit = 10; // 砖块单位长度
export const sizeAlpha = 0.9; // 干员单位尺寸系数
