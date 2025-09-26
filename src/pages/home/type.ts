// 類型定義
export interface Tile {
  type: number;
  shift: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface TileCoordinate {
  x: number;
  y: number;
}

export interface MouseTileResult {
  valid: boolean;
  x: number;
  y: number;
}

export interface SelectedTile {
  selected: boolean;
  column: number;
  row: number;
}

export interface TConfig {
  x: number;
  y: number;
  columns: number;
  rows: number;
  tile: { width: number; height: number; data: Tile[][] };
  selected: SelectedTile;
}

export interface Cluster {
  column: number;
  row: number;
  length: number;
  horizontal: boolean;
}

export interface Move {
  column1: number;
  row1: number;
  column2: number;
  row2: number;
}

export enum GameState {
  INIT = 0,
  READY = 1,
  RESOLVE = 2,
  GAME_OVER = 3,
}

export type TState = {
  isDrag: boolean;
  status: GameState;
  time: {
    lastFrame: number;
    fpsTime: number;
    fps: number;
    count: number;
  };
  animation: {
    state: 0 | 1 | 2 | 3;
    time: number;
    total: number;
  };
};
