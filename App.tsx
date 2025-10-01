// Fix: Update imports to use TILE_SIZE and import LEVEL_LAYOUT as LEVEL from constants.
import { useEffect, useRef, useState } from 'react';
import { TILE_SIZE, GRAVITY, JUMP_VELOCITY, MOVE_ACCEL, MOVE_MAX, FRICTION, TERMINAL_VY, LEVEL_LAYOUT as LEVEL, STAR_DURATION, FIREBALL_SPEED, KOOPA_SHELL_SPEED, KOOPA_SHELL_REVERT_TIME, PIRANHA_EMERGE_TIME, HAMMERBRO_JUMP_INTERVAL, HAMMERBRO_JUMP_VELOCITY, HAMMERBRO_THROW_INTERVAL, HAMMER_GRAVITY, HAMMER_SPEED_X, HAMMER_SPEED_Y, LAKITU_SPEED, LAKITU_THROW_INTERVAL } from './constants';
import { GameStatus } from './types';
import type { PlayerState, EnemyState, GameState, TileState, PowerUpState, FireballState, KoopaState, PowerUpType, HammerState } from './types';
// Fix: Import SkinConfig and SpriteDef types to resolve TS errors.
import { type SkinPack, type SkinConfig, type SpriteDef, loadSkin, drawSprite } from './src/skin';

const SOLID = new Set(['#', '=', 'U']);
const BREAKABLE = new Set(['#']);
const QUESTION_BLOCK = new Set(['?','M','I','S']);

type Camera = { x: number };
const skinKeyList = ['default', 'plumber_red'] as const;
type SkinKey = typeof skinKeyList[number];

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [skinKey, setSkinKey] = useState<SkinKey>('default');
  const skinRef = useRef<SkinPack | null>(null);

  const stateRef = useRef<{
    game: GameState;
    camera: Camera;
    player: PlayerState;
    enemies: EnemyState[];
    powerUps: PowerUpState[];
    fireballs: FireballState[];
    hammers: HammerState[];
    worldGrid: TileState[][];
    coins: { x: number; y: number; w: number; h: number; taken: boolean; t: number }[];
    world: { rows: number; cols: number };
    keys: Set<string>;
    flag: { x: number; y: number; w: number; h: number } | null;
    time: number;
  } | null>(null);

  // helpers
  const rows = LEVEL.length;
  const cols = LEVEL[0].length;

  useEffect(() => {
    let alive = true;
    loadSkin(skinKey).then(s => {
      if (alive) skinRef.current = s;
    });
    return () => { alive = false; }
  }, [skinKey]);

  function switchSkin() {
    const currentIndex = skinKeyList.indexOf(skinKey);
    const nextIndex = (currentIndex + 1) % skinKeyList.length;
    setSkinKey(skinKeyList[nextIndex]);
  }

  function tileAt(tx: number, ty: number): TileState {
    const s = stateRef.current!;
    if (ty < 0 || ty >= rows || tx < 0 || tx >= cols) return { char: '#', originalChar: '#', hit: false, content: null };
    return s.worldGrid[ty][tx];
  }

  function setTile(tx: number, ty: number, char: string) {
    const s = stateRef.current!;
    if (ty < 0 || ty >= rows || tx < 0 || tx >= cols) return;
    s.worldGrid[ty][tx].char = char;
  }

  function isSolid(ch: string) {
    return SOLID.has(ch);
  }

  function rectOverlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
    return !(ax + aw < bx || bx + bw < ax || ay + ah < by || by + bh < ay);
  }

  function resolvePhysicsRect(r: { pos: {x: number; y: number;}; vel: {x: number; y: number;}; w: number; h: number; grounded?: boolean }) {
    // Horizontal resolve
    r.pos.x += r.vel.x;
    const xDir = Math.sign(r.vel.x);
    if (xDir !== 0) {
      const aheadX = xDir > 0 ? Math.floor((r.pos.x + r.w) / TILE_SIZE) : Math.floor(r.pos.x / TILE_SIZE);
      const y0 = Math.floor(r.pos.y / TILE_SIZE);
      const y1 = Math.floor((r.pos.y + r.h - 1) / TILE_SIZE);
      for (let ty = y0; ty <= y1; ty++) {
        if (isSolid(tileAt(aheadX, ty).char)) {
          r.pos.x = xDir > 0 ? aheadX * TILE_SIZE - r.w : aheadX * TILE_SIZE + TILE_SIZE;
          r.vel.x = 0;
          break;
        }
      }
    }
    
    // Vertical resolve
    if (r.grounded !== undefined) r.grounded = false;
    r.pos.y += r.vel.y;
    const yDir = Math.sign(r.vel.y);
    if (yDir !== 0) {
      const aheadY = yDir > 0 ? Math.floor((r.pos.y + r.h) / TILE_SIZE) : Math.floor(r.pos.y / TILE_SIZE);
      const x0 = Math.floor(r.pos.x / TILE_SIZE);
      const x1 = Math.floor((r.pos.x + r.w - 1) / TILE_SIZE);
      for (let tx = x0; tx <= x1; tx++) {
        if (isSolid(tileAt(tx, aheadY).char)) {
          r.pos.y = yDir > 0 ? aheadY * TILE_SIZE - r.h : aheadY * TILE_SIZE + TILE_SIZE;
          if (yDir > 0 && r.grounded !== undefined) r.grounded = true;
          r.vel.y = 0;
          break;
        }
      }
    }
  }

  function spawnPowerUp(tx: number, ty: number, type: PowerUpType) {
    const s = stateRef.current!;
    const powerUp: PowerUpState = {
      type: type,
      pos: { x: tx * TILE_SIZE, y: ty * TILE_SIZE - TILE_SIZE },
      vel: { x: 2, y: 0 },
      w: TILE_SIZE,
      h: TILE_SIZE,
      alive: true,
    };
    s.powerUps.push(powerUp);
  }

  function playerHitBlock(tx: number, ty: number) {
    const s = stateRef.current!;
    const tile = tileAt(tx, ty);
    if (tile.hit) return;

    tile.hit = true;

    if (QUESTION_BLOCK.has(tile.originalChar)) {
      if (tile.content === 'coin') {
        s.game.score += 200;
        // You can add a coin animation here
      } else if (tile.content) {
        spawnPowerUp(tx, ty, tile.content);
      }
      setTile(tx, ty, 'U'); // 'U' for used block
    } else if (BREAKABLE.has(tile.originalChar)) {
        if (s.player.powerUp !== 'small') {
            setTile(tx, ty, '.');
            s.game.score += 50;
            // You can add a breaking animation here
        }
    }
  }

  function init() {
    const playerStart = { x: 5 * TILE_SIZE, y: (rows - 2) * TILE_SIZE };
    const newEnemies: EnemyState[] = [];
    const newWorldGrid: TileState[][] = [];
    let flag = null;

    LEVEL.forEach((rowStr, y) => {
      newWorldGrid[y] = [];
      rowStr.split('').forEach((char, x) => {
        let content: PowerUpType | 'coin' | null = null;
        if (char === '?') content = 'coin';
        if (char === 'M') content = 'mushroom';
        if (char === 'I') content = 'fireFlower';
        if (char === 'S') content = 'star';
        
        let gridChar = char;
        if (char === 'H') {
          newEnemies.push({ type: 'hammerbro', pos: { x: x * TILE_SIZE, y: (y - 2) * TILE_SIZE }, vel: { x: 0, y: 0 }, w: TILE_SIZE, h: TILE_SIZE * 2, dir: -1, alive: true, grounded: false, jumpTimer: HAMMERBRO_JUMP_INTERVAL, throwTimer: Math.random() * HAMMERBRO_THROW_INTERVAL });
          gridChar = '='; // Hammer Bro stands on a solid block
        }
        if (char === 'L') {
            newEnemies.push({ type: 'lakitu', pos: { x: x * TILE_SIZE, y: y * TILE_SIZE }, vel: { x: 0, y: 0 }, w: TILE_SIZE, h: TILE_SIZE, dir: 1, alive: true, throwTimer: LAKITU_THROW_INTERVAL });
            gridChar = '.'; // Lakitu floats in the air
        }

        newWorldGrid[y][x] = { char: gridChar, originalChar: char, hit: false, content };

        if (char === 'P') playerStart.x = x * TILE_SIZE; playerStart.y = y * TILE_SIZE;
        if (char === 'E') newEnemies.push({ type: 'goomba', pos: { x: x * TILE_SIZE, y: y * TILE_SIZE }, vel: { x: -1, y: 0 }, w: TILE_SIZE, h: TILE_SIZE, dir: -1, alive: true, grounded: false });
        if (char === 'K') newEnemies.push({ type: 'koopa', pos: { x: x * TILE_SIZE, y: y * TILE_SIZE }, vel: { x: -1, y: 0 }, w: TILE_SIZE, h: TILE_SIZE * 1.5, dir: -1, alive: true, koopaState: 'walk', grounded: false });
        if (char === 'T') newEnemies.push({ type: 'piranha', pos: { x: x * TILE_SIZE, y: (y+1) * TILE_SIZE }, vel: {x:0, y:0}, w: TILE_SIZE, h: TILE_SIZE * 1.5, dir: 1, alive: true, emergeTimer: PIRANHA_EMERGE_TIME, emergeState: 'hiding', startY: (y+1) * TILE_SIZE });
        if (char === 'F') flag = { x: x * TILE_SIZE, y: y * TILE_SIZE, w: TILE_SIZE, h: (rows - y) * TILE_SIZE };
      });
    });

    stateRef.current = {
      game: { status: GameStatus.Playing, score: 0, lives: 3 },
      camera: { x: 0 },
      player: { pos: playerStart, vel: { x: 0, y: 0 }, w: TILE_SIZE, h: TILE_SIZE, grounded: false, alive: true, powerUp: 'small', invincibilityTimer: 0 },
      enemies: newEnemies,
      powerUps: [],
      fireballs: [],
      hammers: [],
      worldGrid: newWorldGrid,
      coins: [],
      world: { rows, cols },
      keys: new Set(),
      flag,
      time: 400,
    };
  }

  function update() {
    const s = stateRef.current;
    if (!s) return;
    if (s.game.status !== GameStatus.Playing) return;

    const { player, keys, camera } = s;

    // Update time
    s.time -= 1/60;
    if (s.time <= 0) {
      player.alive = false;
      s.time = 0;
    }

    // Player controls
    if (keys.has('ArrowLeft')) player.vel.x = Math.max(player.vel.x - MOVE_ACCEL, -MOVE_MAX);
    if (keys.has('ArrowRight')) player.vel.x = Math.min(player.vel.x + MOVE_ACCEL, MOVE_MAX);
    if (keys.has('ArrowUp') && player.grounded) player.vel.y = JUMP_VELOCITY;
    if (keys.has(' ')) { // Fireball
        if (player.powerUp === 'fire' && s.fireballs.length < 2) {
            const dir = (player.vel.x >= 0 ? 1 : -1) * (keys.has('ArrowLeft') ? -1 : 1) * (keys.has('ArrowRight') ? 1 : 1);
            s.fireballs.push({
                pos: { x: player.pos.x + (dir > 0 ? player.w : -16), y: player.pos.y + player.h / 2 },
                vel: { x: dir * FIREBALL_SPEED, y: 0 },
                w: 16, h: 16, alive: true, t: 0, grounded: false,
            });
            keys.delete(' '); // Prevent autofire
        }
    }

    // Update player
    if (player.alive) {
      player.vel.x *= FRICTION;
      player.vel.y += GRAVITY;
      player.vel.y = Math.min(player.vel.y, TERMINAL_VY);

      resolvePhysicsRect(player);
    
      // Head bump check
      if (player.vel.y < 0) {
          const aheadY = Math.floor(player.pos.y / TILE_SIZE);
          const x0 = Math.floor(player.pos.x / TILE_SIZE);
          const x1 = Math.floor((player.pos.x + player.w - 1) / TILE_SIZE);
          for (let tx = x0; tx <= x1; tx++) {
              if (isSolid(tileAt(tx, aheadY).char)) {
                  playerHitBlock(tx, aheadY);
              }
          }
      }

      // Invincibility timer
      if (player.invincibilityTimer > 0) {
        player.invincibilityTimer -= 1/60;
      }
    } else {
        // Dead animation
        player.vel.y += GRAVITY;
        player.pos.y += player.vel.y;
        if (player.pos.y > rows * TILE_SIZE + 200) {
            s.game.lives--;
            if (s.game.lives > 0) {
                init(); // Restart level
            } else {
                s.game.status = GameStatus.GameOver;
            }
        }
    }

    // Update powerUps
    s.powerUps.forEach(p => {
      if (!p.alive) return;
      p.vel.y += GRAVITY;
      resolvePhysicsRect(p);
      if (rectOverlap(player.pos.x, player.pos.y, player.w, player.h, p.pos.x, p.pos.y, p.w, p.h)) {
          p.alive = false;
          s.game.score += 1000;
          if (p.type === 'mushroom') {
              if (player.powerUp === 'small') {
                  player.powerUp = 'big';
                  player.pos.y -= TILE_SIZE;
                  player.h = TILE_SIZE * 2;
              }
          } else if (p.type === 'fireFlower') {
              if (player.powerUp === 'small') {
                  player.powerUp = 'big';
                  player.pos.y -= TILE_SIZE;
                  player.h = TILE_SIZE * 2;
              }
              player.powerUp = 'fire';
          } else if (p.type === 'star') {
              player.invincibilityTimer = STAR_DURATION;
          }
      }
    });
    s.powerUps = s.powerUps.filter(p => p.alive);

    // Update fireballs
    s.fireballs.forEach(f => {
      if (!f.alive) return;
      f.t += 1/60;
      f.vel.y += GRAVITY/2; // Less gravity
      resolvePhysicsRect(f);
      // Fix: Check for grounded property which now exists on FireballState
      if (f.grounded) f.vel.y = -4; // Bounce
      
      const tx = Math.floor((f.pos.x + f.w/2) / TILE_SIZE);
      const ty = Math.floor((f.pos.y + f.h/2) / TILE_SIZE);
      if (isSolid(tileAt(tx, ty).char)) f.alive = false;

      // Check collision with enemies
      s.enemies.forEach(e => {
        if (e.alive && rectOverlap(f.pos.x, f.pos.y, f.w, f.h, e.pos.x, e.pos.y, e.w, e.h)) {
          f.alive = false;
          e.alive = false; // Simple kill, can be improved
          s.game.score += 200;
        }
      });
    });
    s.fireballs = s.fireballs.filter(f => f.alive && f.pos.x > camera.x && f.pos.x < camera.x + cols * TILE_SIZE);

    // Update hammers
    s.hammers.forEach(h => {
        if (!h.alive) return;
        h.t += 1/60;
        h.vel.y += HAMMER_GRAVITY;
        h.pos.x += h.vel.x;
        h.pos.y += h.vel.y;
        if (h.pos.y > s.world.rows * TILE_SIZE) h.alive = false;

        if (player.alive && rectOverlap(player.pos.x, player.pos.y, player.w, player.h, h.pos.x, h.pos.y, h.w, h.h)) {
            h.alive = false;
            if (player.invincibilityTimer <= 0) { // Player gets hit
                player.invincibilityTimer = 1.5; // seconds of flicker
                if (player.powerUp === 'fire') {
                    player.powerUp = 'big';
                } else if (player.powerUp === 'big') {
                    player.powerUp = 'small';
                    player.h = TILE_SIZE;
                    player.pos.y += TILE_SIZE;
                } else {
                    player.alive = false;
                    player.vel.y = JUMP_VELOCITY;
                }
            }
        }
    });
    s.hammers = s.hammers.filter(h => h.alive);

    // Update enemies
    s.enemies.forEach(e => {
      if (!e.alive) return;

      if (e.type === 'piranha') {
          const startY = e.startY!;
          const emergedY = startY - e.h;
          const playerDistX = Math.abs((player.pos.x + player.w / 2) - (e.pos.x + e.w / 2));
          e.emergeTimer! -= 1/60;
          
          switch (e.emergeState) {
              case 'hiding':
                  if (e.emergeTimer! <= 0 && playerDistX > TILE_SIZE * 1.5) {
                      e.emergeState = 'emerging';
                  }
                  break;
              case 'emerging':
                  e.pos.y -= 1; // Move up
                  if (e.pos.y <= emergedY) {
                      e.pos.y = emergedY;
                      e.emergeState = 'showing';
                      e.emergeTimer = PIRANHA_EMERGE_TIME;
                  }
                  break;
              case 'showing':
                  if (e.emergeTimer! <= 0) {
                      e.emergeState = 'retracting';
                  }
                  break;
              case 'retracting':
                  e.pos.y += 1; // Move down
                  if (e.pos.y >= startY) {
                      e.pos.y = startY;
                      e.emergeState = 'hiding';
                      e.emergeTimer = PIRANHA_EMERGE_TIME;
                  }
                  break;
          }
      } else if (e.type === 'hammerbro') {
          e.vel.y += GRAVITY;
          resolvePhysicsRect(e);
          e.dir = (player.pos.x < e.pos.x) ? -1 : 1;

          if (e.grounded) {
              e.jumpTimer! -= 1/60;
              if (e.jumpTimer! <= 0) {
                  e.vel.y = HAMMERBRO_JUMP_VELOCITY;
                  e.jumpTimer = HAMMERBRO_JUMP_INTERVAL;
              }
          }

          e.throwTimer! -= 1/60;
          if (e.throwTimer! <= 0) {
              s.hammers.push({
                  pos: { x: e.pos.x, y: e.pos.y + TILE_SIZE / 2 },
                  vel: { x: e.dir * HAMMER_SPEED_X, y: HAMMER_SPEED_Y },
                  w: 16, h: 16, alive: true, t: 0,
              });
              e.throwTimer = HAMMERBRO_THROW_INTERVAL;
          }
      } else if (e.type === 'lakitu') {
          // Follow player
          const targetX = player.pos.x - e.w / 2;
          const dx = targetX - e.pos.x;
          e.dir = dx > 0 ? 1 : -1;
          if (Math.abs(dx) > LAKITU_SPEED) {
              e.vel.x = Math.sign(dx) * LAKITU_SPEED;
          } else {
              e.vel.x = 0;
          }
          e.pos.x += e.vel.x;

          e.throwTimer! -= 1/60;
          if (e.throwTimer! <= 0) {
              s.enemies.push({ type: 'spiny', pos: { x: e.pos.x, y: e.pos.y + e.h }, vel: { x: -1, y: 0 }, w: TILE_SIZE, h: TILE_SIZE, dir: -1, alive: true, grounded: false });
              e.throwTimer = LAKITU_THROW_INTERVAL;
          }
      } else {
        // Patrol AI: turn at cliffs
        if (e.type === 'goomba' || e.type === 'spiny' || (e.type === 'koopa' && e.koopaState === 'walk')) {
          if (e.grounded) {
            const checkX = e.dir > 0 ? e.pos.x + e.w : e.pos.x - 1;
            const checkY = e.pos.y + e.h + 1;
            const tx = Math.floor(checkX / TILE_SIZE);
            const ty = Math.floor(checkY / TILE_SIZE);
            if (!isSolid(tileAt(tx, ty).char)) {
                e.dir *= -1;
            }
          }
        }

        if (e.koopaState !== 'shell_moving') {
          e.vel.x = e.dir * (e.koopaState === 'shell' ? 0 : 1);
        }
        e.vel.y += GRAVITY;
        resolvePhysicsRect(e);
        // Patrol AI: turn at walls
        if (e.vel.x === 0 && e.koopaState !== 'shell') {
          e.dir *= -1;
        }
      }
      
      // Collision with player
      if (player.alive && rectOverlap(player.pos.x, player.pos.y, player.w, player.h, e.pos.x, e.pos.y, e.w, e.h)) {
        if (player.invincibilityTimer > 0) {
            e.alive = false;
            s.game.score += 200;
        } // Stomp
        else if (player.vel.y > 0 && player.pos.y + player.h < e.pos.y + e.h / 2) {
          s.game.score += 100;
          player.vel.y = JUMP_VELOCITY * 0.7;
          player.grounded = false;
          if (e.type === 'spiny') {
            if (player.invincibilityTimer <= 0) {
                player.invincibilityTimer = 1.5;
                if (player.powerUp === 'fire') player.powerUp = 'big';
                else if (player.powerUp === 'big') {
                    player.powerUp = 'small';
                    player.h = TILE_SIZE;
                    player.pos.y += TILE_SIZE;
                } else {
                    player.alive = false;
                    player.vel.y = JUMP_VELOCITY;
                }
            }
          } else if (e.type === 'goomba' || e.type === 'hammerbro' || e.type === 'lakitu') {
              e.alive = false;
          } else if (e.type === 'koopa') {
              if (e.koopaState === 'walk') {
                  e.koopaState = 'shell';
                  e.h = TILE_SIZE; // shell is smaller
                  e.pos.y += TILE_SIZE * 0.5;
                  e.shellTimer = KOOPA_SHELL_REVERT_TIME;
              } else if (e.koopaState === 'shell') {
                  e.koopaState = 'shell_moving';
                  e.vel.x = (player.pos.x + player.w/2 < e.pos.x + e.w/2 ? 1 : -1) * KOOPA_SHELL_SPEED;
                  delete e.shellTimer;
              } else if (e.koopaState === 'shell_moving') {
                  e.koopaState = 'shell';
                  e.shellTimer = KOOPA_SHELL_REVERT_TIME;
              }
          }
        } // Kick shell from side
        else if (e.type === 'koopa' && e.koopaState === 'shell') {
            e.koopaState = 'shell_moving';
            e.vel.x = (player.pos.x + player.w/2 < e.pos.x + e.w/2 ? 1 : -1) * KOOPA_SHELL_SPEED;
            delete e.shellTimer;
        } else if (player.invincibilityTimer <= 0) { // Player gets hit
          player.invincibilityTimer = 1.5; // seconds of flicker
          if (player.powerUp === 'fire') {
              player.powerUp = 'big';
          } else if (player.powerUp === 'big') {
              player.powerUp = 'small';
              player.h = TILE_SIZE;
              player.pos.y += TILE_SIZE;
          } else {
              player.alive = false;
              player.vel.y = JUMP_VELOCITY;
          }
        }
      }

      // Koopa shell logic
      if (e.type === 'koopa') {
        if (e.koopaState === 'shell' && e.shellTimer! > 0) {
            e.shellTimer! -= 1/60;
            if (e.shellTimer! <= 0) {
                e.koopaState = 'walk';
                e.h = TILE_SIZE * 1.5;
                e.pos.y -= TILE_SIZE * 0.5;
            }
        }
        if (e.koopaState === 'shell_moving') {
          // shell collision with other enemies
          s.enemies.forEach(other => {
            if (e !== other && other.alive && rectOverlap(e.pos.x, e.pos.y, e.w, e.h, other.pos.x, other.pos.y, other.w, other.h)) {
              other.alive = false;
              s.game.score += 200;
            }
          });
        }
      }
    });

    // Update camera
    camera.x = Math.max(0, Math.min(player.pos.x - canvasRef.current!.width / 3, cols * TILE_SIZE - canvasRef.current!.width));

    // Win condition
    if (s.flag && player.pos.x > s.flag.x) {
        s.game.status = GameStatus.GameWon;
    }
  }

  function draw() {
    const s = stateRef.current;
    const canvas = canvasRef.current;
    const skin = skinRef.current;
    if (!s || !canvas || !skin) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { player, camera } = s;

    // Clear canvas & draw background
    ctx.fillStyle = skin.config.palette?.bg ?? '#7ec0ff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw tiles
    const tx0 = Math.floor(camera.x / TILE_SIZE);
    const tx1 = Math.ceil((camera.x + canvas.width) / TILE_SIZE);
    const ty0 = 0;
    const ty1 = s.world.rows;

    for (let ty = ty0; ty < ty1; ty++) {
      for (let tx = tx0; tx < tx1; tx++) {
        const tile = tileAt(tx, ty);
        const x = tx * TILE_SIZE;
        const y = ty * TILE_SIZE;
        if (tile.char === '.') continue; // Skip empty space

        if (skinRef.current && skinRef.current.config.tiles && skinRef.current.images.tiles) {
          const skin = skinRef.current;
          let frameIndex = -1;
          if (isSolid(tile.char)) frameIndex = 0;
          if (tile.char === '=') frameIndex = 1;
          if (QUESTION_BLOCK.has(tile.originalChar)) frameIndex = tile.hit ? 3 : 2;
          
          if (frameIndex !== -1) {
            const sx = (frameIndex * skin.config.tiles.frameW);
            const sy = 0;
            ctx.drawImage(skin.images.tiles, sx, sy, TILE_SIZE, TILE_SIZE, x - camera.x, y, TILE_SIZE, TILE_SIZE);
          }
        } else {
            // Fallback rendering for when a skin doesn't have tile graphics
            if (QUESTION_BLOCK.has(tile.originalChar)) {
                ctx.fillStyle = tile.hit ? '#A9A9A9' : '#FFD700'; // DarkGray when hit, Gold otherwise
                ctx.fillRect(x - camera.x, y, TILE_SIZE, TILE_SIZE);
                if (!tile.hit) {
                    ctx.fillStyle = 'black';
                    ctx.font = '20px "Press Start 2P"';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    // Adjust y-offset for better centering of the '?'
                    ctx.fillText('?', x - camera.x + TILE_SIZE / 2, y + TILE_SIZE / 2 + 2);
                }
            } else if (tile.char === '=') {
                ctx.fillStyle = '#D2691E'; // A distinct color for platforms
                ctx.fillRect(x - camera.x, y, TILE_SIZE, TILE_SIZE);
            } else if (isSolid(tile.char)) {
                ctx.fillStyle = '#8B4513'; // Brown for solid blocks
                ctx.fillRect(x - camera.x, y, TILE_SIZE, TILE_SIZE);
            }
        }
      }
    }
    
    // Draw coins
    // Fix: wrap coin drawing in a check to prevent crash on skins without coin defs
    if (skinRef.current && skinRef.current.config.tiles?.animations?.coin) {
      for (const c of s.coins) {
        if (!c.taken && rectOverlap(c.x, c.y, c.w, c.h, camera.x, 0, canvas.width, canvas.height)) {
          drawSprite(ctx, skinRef.current.images.tiles, skinRef.current.config.tiles, 'coin', s.time, c.x - camera.x, c.y, c.w, c.h);
        }
      }
    }

    // Draw powerUps
    s.powerUps.forEach(p => {
      if (!p.alive) return;
      // Fix: Use a type-safe method to get the skin config key to avoid TS errors.
      const key = (() => {
        switch (p.type) {
          case 'mushroom': return 'powerUpMushroom';
          case 'fireFlower': return 'powerUpFireFlower';
          case 'star': return 'powerUpStar';
        }
      })();
      if (skin.config[key] && skin.images[key]) {
        drawSprite(ctx, skin.images[key], skin.config[key] as SpriteDef, 'idle', s.time, p.pos.x - camera.x, p.pos.y, p.w, p.h);
      } else {
        ctx.fillStyle = p.type === 'mushroom' ? 'red' : p.type === 'fireFlower' ? 'orange' : 'yellow';
        ctx.fillRect(p.pos.x - camera.x, p.pos.y, p.w, p.h);
      }
    });

    // Draw fireballs
    s.fireballs.forEach(f => {
      if (skin.config.fireball && skin.images.fireball) {
        drawSprite(ctx, skin.images.fireball, skin.config.fireball, 'spin', f.t, f.pos.x - camera.x, f.pos.y, f.w, f.h);
      } else {
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.arc(f.pos.x - camera.x + f.w/2, f.pos.y + f.h/2, f.w/2, 0, Math.PI*2);
        ctx.fill();
      }
    });

    // Draw hammers
    s.hammers.forEach(h => {
        if (skin.config.hammer && skin.images.hammer) {
            // drawSprite(ctx, skin.images.hammer, skin.config.hammer, 'spin', h.t, h.pos.x - camera.x, h.pos.y, h.w, h.h);
        } else {
            ctx.save();
            ctx.translate(h.pos.x - camera.x + h.w/2, h.pos.y + h.h/2);
            ctx.rotate(h.t * 20); // spinning
            ctx.fillStyle = 'gray';
            ctx.fillRect(-h.w/2, -h.h/2, h.w, h.h);
            ctx.restore();
        }
    });

    // Draw enemies
    s.enemies.forEach(e => {
        let key: keyof SkinConfig | null = null;
        switch(e.type) {
            case 'goomba': key = 'enemyGoomba'; break;
            case 'koopa': key = 'enemyKoopa'; break;
            case 'piranha': key = 'enemyPiranha'; break;
            case 'hammerbro': key = 'enemyHammerBro'; break;
            case 'lakitu': key = 'enemyLakitu'; break;
            case 'spiny': key = 'enemySpiny'; break;
        }

        const anim = e.alive ? (e.koopaState === 'shell' || e.koopaState === 'shell_moving' ? 'shell' : (e.type === 'piranha' ? 'bite' : 'walk')) : 'squash';
        
        if (key && skin.config[key] && skin.images[key]) {
            const spriteDef = skin.config[key] as SpriteDef;
            ctx.save();
            if (e.dir === -1 && e.type !== 'lakitu' && e.koopaState !== 'shell' && e.koopaState !== 'shell_moving') {
                ctx.scale(-1, 1);
                ctx.translate(-(e.pos.x - camera.x) * 2 - e.w, 0);
            }
            drawSprite(ctx, skin.images[key], spriteDef, anim, s.time, e.pos.x - camera.x, e.pos.y, e.w, e.h);
            ctx.restore();
        } else {
            // fallback rects
            let color = 'magenta'; // Default for unexpected types
             switch (e.type) {
                case 'goomba': color = '#964B00'; break;
                case 'koopa': color = 'green'; break;
                case 'piranha': color = 'red'; break;
                case 'hammerbro': color = '#333'; break;
                case 'lakitu': color = '#f0e68c'; break;
                case 'spiny': color = '#800000'; break;
            }
            ctx.fillStyle = color;
            ctx.fillRect(e.pos.x - camera.x, e.pos.y, e.w, e.alive ? e.h : e.h / 2);

            if (e.type === 'lakitu' && e.alive) {
                ctx.fillStyle = 'black';
                ctx.fillRect(e.pos.x - camera.x + e.w/4, e.pos.y + e.h/4, e.w/2, e.h/4);
            }
        }
    });

    // Draw player
    const isInvincible = player.invincibilityTimer > 0;
    const isStar = isInvincible && player.invincibilityTimer > STAR_DURATION - 0.5; // check if star was just picked up
    if (!isStar && isInvincible && Math.floor(s.time * 20) % 2 === 0) {
      // flicker
    } else {
      ctx.save();
      // flip sprite based on velocity, not keypress
      if (player.vel.x < -0.1) {
        ctx.scale(-1, 1);
        ctx.translate(-(player.pos.x - camera.x) * 2 - player.w, 0);
      }
      
      if (skin.config.player && skin.images.player) {
        let anim = 'idle';
        if (!player.grounded) anim = player.vel.y < 0 ? 'jump' : 'fall';
        else if (Math.abs(player.vel.x) > 0.5) anim = 'run';
        
        if (player.powerUp === 'big') anim += '-big';
        if (player.powerUp === 'fire') anim += '-fire';
        
        drawSprite(ctx, skin.images.player, skin.config.player, anim, s.time, player.pos.x - camera.x, player.pos.y, player.w, player.h);
      } else {
        // fallback rect
        ctx.fillStyle = player.powerUp === 'fire' ? '#FF4500' : player.powerUp === 'big' ? '#8B0000' : 'red';
        ctx.fillRect(player.pos.x - camera.x, player.pos.y, player.w, player.h);
      }
      ctx.restore();
    }
  }

  useEffect(() => {
    init();

    function handleKeyDown(e: KeyboardEvent) { stateRef.current?.keys.add(e.key); }
    function handleKeyUp(e: KeyboardEvent) { stateRef.current?.keys.delete(e.key); }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let frameId: number;
    function gameLoop() {
      update();
      draw();
      frameId = requestAnimationFrame(gameLoop);
    }
    gameLoop();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(frameId);
    };
  }, []);

  const s = stateRef.current?.game;

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center">
      <div className="relative" style={{ width: 1024, height: 768 }}>
        {(!s || s.status === GameStatus.Start) && <div className="absolute inset-0 bg-black text-white flex flex-col items-center justify-center z-10"><h1 className="text-4xl">Loading...</h1></div>}
        {s?.status === GameStatus.GameOver && <div className="absolute inset-0 bg-black text-white flex flex-col items-center justify-center z-10"><h1 className="text-4xl">Game Over</h1><button onClick={init}>Restart</button></div>}
        {s?.status === GameStatus.GameWon && <div className="absolute inset-0 bg-black text-white flex flex-col items-center justify-center z-10"><h1 className="text-4xl">You Win!</h1><p>Score: {s.score}</p><button onClick={init}>Play Again</button></div>}
        <canvas ref={canvasRef} width={1024} height={768} className="bg-blue-400"></canvas>
        <button onClick={switchSkin} className="absolute bottom-4 right-4 bg-gray-500 text-white p-2 rounded">Switch Skin</button>
        {s && <div className="absolute top-4 left-4 text-white font-mono">
            SCORE: {s.score} LIVES: {s.lives} TIME: {Math.ceil(stateRef.current?.time ?? 0)}
        </div>}
      </div>
    </div>
  );
}

export default App;