

export enum GameStatus {
  Start = 'start',
  Playing = 'playing',
  GameOver = 'gameOver',
  GameWon = 'gameWon',
}

export type Vec2 = { x: number; y: number };

export type PlayerPowerUp = 'small' | 'big' | 'fire';

export type PlayerState = {
  pos: Vec2;
  vel: Vec2;
  w: number;
  h: number;
  grounded: boolean;
  alive: boolean;
  powerUp: PlayerPowerUp;
  invincibilityTimer: number; // For star and post-damage flicker
};

export type EnemyType = 'goomba' | 'koopa' | 'piranha';
export type KoopaState = 'walk' | 'shell' | 'shell_moving';

export type EnemyState = {
  type: EnemyType;
  pos: Vec2;
  vel: Vec2;
  w: number;
  h: number;
  dir: 1 | -1;
  alive: boolean;
  grounded?: boolean;
  // Koopa specific
  koopaState?: KoopaState;
  shellTimer?: number;
  // Piranha specific
  emergeTimer?: number;
  emergeState?: 'hiding' | 'emerging' | 'showing' | 'retracting';
  startY?: number;
};

export type PowerUpType = 'mushroom' | 'fireFlower' | 'star';

export type PowerUpState = {
  type: PowerUpType;
  pos: Vec2;
  vel: Vec2;
  w: number;
  h: number;
  alive: boolean;
};

export type FireballState = {
  pos: Vec2;
  vel: Vec2;
  w: number;
  h: number;
  alive: boolean;
  t: number;
  // Fix: Add grounded property for physics resolution.
  grounded?: boolean;
};

export type TileState = {
  char: string;
  originalChar: string;
  hit: boolean;
  content: PowerUpType | 'coin' | null;
}

export type GameState = {
  status: GameStatus;
  score: number;
  lives: number;
};