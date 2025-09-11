
// Fix: Renamed TILE to TILE_SIZE to match usage in components.
export const TILE_SIZE = 32;
export const GRAVITY = 0.9;
export const JUMP_VELOCITY = -15;
export const MOVE_ACCEL = 0.7;
export const MOVE_MAX = 5.2;
export const FRICTION = 0.85;
export const TERMINAL_VY = 18;

export const STAR_DURATION = 10; // seconds
export const FIREBALL_SPEED = 8;
export const KOOPA_SHELL_SPEED = 9;
export const KOOPA_SHELL_REVERT_TIME = 8; // seconds
export const PIRANHA_EMERGE_TIME = 4; // seconds

// Fix: Moved LEVEL layout from App.tsx and renamed to LEVEL_LAYOUT to be used across components.
export const LEVEL_LAYOUT: string[] = [
  // Legend: # solid, = platform, ? coin, C coin, E goomba, P player, F flag
  // K koopa, T piranha, M mushroom, I fire flower, S star
  '...........................................................................',
  '...........................................................................',
  '.......................I............................====...................',
  '............................................C..............................',
  '..................M.......====?====...........S............................',
  '......................C....................C.................K.............',
  '.............====?====.....................................................',
  '......................................................E...........K........',
  '#########.....#########..............######.....T.......###################',
  '###########################################################################',
];
