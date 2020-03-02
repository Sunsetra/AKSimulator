/* WebGL可用性常量 */
export enum WebGLAvailability {
  Unavailable,
  Available,
  WebGL2Available,
}


/* 渲染类型常量 */
export enum RenderType {
  StaticRender = 'STATIC',
  DynamicRender = 'DYNAMIC',
}


/* 砖块类型常量 */
export enum BlockType {
  PlaceableBlock = 'ALL',
  BasicBlock = 'MELEE',
  HighBlock = 'RANGED',
}


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
  Yellow,
  Orange,
}


/* 单位职业常量定义 */
export enum Profession {
  Guard = 'GUARD',
  Caster = 'CASTER',
  Vanguard = 'VANGUARD',
  Medic = 'MEDIC',
  Defender = 'DEFENDER',
  Sniper = 'SNIPER',
  Supporter = 'SUPPORTER',
  Specialist = 'SPECIALIST',
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
