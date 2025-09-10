export enum GameStatus {
  Start = 'start',
  Playing = 'playing',
  GameOver = 'gameOver',
  GameWon = 'gameWon',
}

export type Vec2 = { x: number; y: number };

export type PlayerState = {
  pos: Vec2;
  vel: Vec2;
  w: number;
  h: number;
  grounded: boolean;
  alive: boolean;
};

export type EnemyState = {
  pos: Vec2;
  vel: Vec2;
  w: number;
  h: number;
  dir: 1 | -1;
  alive: boolean;
};

export type GameState = {
  status: GameStatus;
  score: number;
  lives: number;
};
