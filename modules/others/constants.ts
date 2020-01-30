/* WebGL可用性常量 */
export enum WebGLAvailability {
  Unavailable,
  Available,
  WebGL2Available,
}


/* 砖块类型常量 */
export enum BlockType {
  PlaceableBlock,
  BasicBlock,
  HighBlock,
}


/* 叠加层常量 */
export enum OverlayType {
  PlaceLayer,
  AttackLayer,
}


/* 稀有度常量定义 */
export enum RarityColor {
  White = 1,
  GreenYellow,
  DeepSkyBlue,
  MediumSlateBlue,
  Gold,
  Orange,
}


export const BlockUnit = 10; // 砖块单位长度
export const sizeAlpha = 0.7; // 单位尺寸系数
