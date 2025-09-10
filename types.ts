
export enum GameStatus {
  NotStarted,
  Playing,
  GameOver,
  GameWon,
}

export interface GameState {
  status: GameStatus;
  score: number;
  lives: number;
  level: number;
  time: number;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isJumping: boolean;
  direction: 'left' | 'right';
  isAlive: boolean;
}

export interface EnemyState {
  id: string;
  x: number;
  y: number;
  vx: number;
  isAlive: boolean;
  direction: 'left' | 'right';
}
