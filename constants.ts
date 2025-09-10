// Fix: Renamed TILE to TILE_SIZE to match usage in components.
export const TILE_SIZE = 32;
export const GRAVITY = 0.9;
export const JUMP_VELOCITY = -15;
export const MOVE_ACCEL = 0.7;
export const MOVE_MAX = 5.2;
export const FRICTION = 0.85;
export const TERMINAL_VY = 18;

// Fix: Moved LEVEL layout from App.tsx and renamed to LEVEL_LAYOUT to be used across components.
export const LEVEL_LAYOUT: string[] = [
  // Legend: # solid, = platform, ? question, C coin, E enemy, P player, F flag, . empty
  '..................................................................',
  '.............................................................C....',
  '...................................................====...........',
  '............................................C.....................',
  '..............................====?====...........................',
  '......................C....................C......................',
  '.............====?====............................................',
  '......................................................E...........',
  '#########.....#########..............######...............F#######',
  '##################################################################',
];
