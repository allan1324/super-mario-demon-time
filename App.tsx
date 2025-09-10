// Fix: Update imports to use TILE_SIZE and import LEVEL_LAYOUT as LEVEL from constants.
import { useEffect, useRef } from 'react';
import { TILE_SIZE, GRAVITY, JUMP_VELOCITY, MOVE_ACCEL, MOVE_MAX, FRICTION, TERMINAL_VY, LEVEL_LAYOUT as LEVEL } from './constants';
import { GameStatus } from './types';
import type { PlayerState, EnemyState, GameState } from './types';

const SOLID = new Set(['#', '=', '?']);

type Camera = { x: number };

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Fix: Initialize useRef with null and update type to allow null.
  const stateRef = useRef<{
    game: GameState;
    camera: Camera;
    player: PlayerState;
    enemies: EnemyState[];
    coins: { x: number; y: number; w: number; h: number; taken: boolean; t: number }[];
    world: { rows: number; cols: number };
    keys: Set<string>;
    flag: { x: number; y: number; w: number; h: number } | null;
  } | null>(null);

  // helpers
  const rows = LEVEL.length;
  const cols = LEVEL[0].length;

  function tileAt(tx: number, ty: number) {
    if (ty < 0 || ty >= rows || tx < 0 || tx >= cols) return '#'; // treat OOB as solid
    return LEVEL[ty].charAt(tx);
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
        if (isSolid(tileAt(aheadX, ty))) {
          r.pos.x = xDir > 0 ? aheadX * TILE_SIZE - r.w - 0.01 : (aheadX + 1) * TILE_SIZE + 0.01;
          r.vel.x = 0;
          break;
        }
      }
    }

    // Vertical resolve
    r.pos.y += r.vel.y;
    const yDir = Math.sign(r.vel.y);
    if (yDir !== 0) {
      const aheadY = yDir > 0 ? Math.floor((r.pos.y + r.h) / TILE_SIZE) : Math.floor(r.pos.y / TILE_SIZE);
      const x0 = Math.floor(r.pos.x / TILE_SIZE);
      const x1 = Math.floor((r.pos.x + r.w - 1) / TILE_SIZE);
      for (let tx = x0; tx <= x1; tx++) {
        if (isSolid(tileAt(tx, aheadY))) {
          r.pos.y = yDir > 0 ? aheadY * TILE_SIZE - r.h - 0.01 : (aheadY + 1) * TILE_SIZE + 0.01;
          r.vel.y = 0;
          if (yDir > 0 && r.grounded !== undefined) r.grounded = true;
          break;
        }
      }
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    const keys = new Set<string>();

    // parse level for entities
    let startX = 2 * TILE_SIZE;
    let startY = 0;
    const enemies: EnemyState[] = [];
    const coins: { x: number; y: number; w: number; h: number; taken: boolean; t: number }[] = [];
    let flag: { x: number; y: number; w: number; h: number } | null = null;

    for (let y = 0; y < rows; y++) {
      const row = LEVEL[y];
      for (let x = 0; x < cols; x++) {
        const ch = row.charAt(x);
        if (ch === 'P') {
          startX = x * TILE_SIZE;
          startY = (y - 1) * TILE_SIZE;
        } else if (ch === 'E') {
          enemies.push({ pos: { x: x * TILE_SIZE, y: (y - 1) * TILE_SIZE }, vel: { x: 0, y: 0 }, w: 28, h: 28, dir: -1, alive: true });
        } else if (ch === 'C') {
          coins.push({ x: x * TILE_SIZE + 8, y: y * TILE_SIZE + 8, w: 16, h: 16, taken: false, t: Math.random() * 6.28 });
        } else if (ch === 'F') {
          flag = { x: x * TILE_SIZE + TILE_SIZE / 2 - 3, y: (y - 6) * TILE_SIZE, w: 6, h: 7 * TILE_SIZE };
        }
      }
    }

    const player: PlayerState = {
      pos: { x: startX, y: startY },
      vel: { x: 0, y: 0 },
      w: 24,
      h: 28,
      grounded: false,
      alive: true,
    };

    const camera: Camera = { x: 0 };

    const game: GameState = {
      status: GameStatus.Playing,
      score: 0,
      lives: 3,
    };

    stateRef.current = {
      game,
      camera,
      player,
      enemies,
      coins,
      world: { rows, cols },
      keys,
      flag,
    };

    const onDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' '].includes(e.key)) e.preventDefault();
      keys.add(e.code);
      if (e.code === 'KeyR') {
        // quick reset
        player.pos.x = startX;
        player.pos.y = startY;
        player.vel.x = 0;
        player.vel.y = 0;
        player.alive = true;
        game.status = GameStatus.Playing;
        camera.x = 0;
      }
    };
    const onUp = (e: KeyboardEvent) => keys.delete(e.code);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);

    let raf = 0;

    function step() {
      const s = stateRef.current!;
      if (s.game.status === GameStatus.Playing) {
        physics(s);
      }
      render(ctx, s);
      raf = requestAnimationFrame(step);
    }

    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  function physics(s: NonNullable<typeof stateRef.current>) {
    const { player, enemies, keys, camera, flag, coins, game } = s;

    // input
    const left = keys.has('ArrowLeft') || keys.has('KeyA');
    const right = keys.has('ArrowRight') || keys.has('KeyD');
    const jump = keys.has('Space') || keys.has('ArrowUp') || keys.has('KeyW');

    const want = (right ? 1 : 0) - (left ? 1 : 0);
    player.vel.x += want * MOVE_ACCEL;
    player.vel.x = Math.max(-MOVE_MAX, Math.min(MOVE_MAX, player.vel.x));
    if (!want) player.vel.x *= FRICTION;

    if (jump && player.grounded) {
      player.vel.y = JUMP_VELOCITY;
      player.grounded = false;
    }

    // gravity
    player.vel.y += GRAVITY;
    if (player.vel.y > TERMINAL_VY) player.vel.y = TERMINAL_VY;

    // move & collide
    player.grounded = false;
    resolvePhysicsRect(player);
    
    // after resolve, update grounded by probing one pixel below feet
    const feetY = Math.floor((player.pos.y + player.h + 1) / TILE_SIZE);
    const x0 = Math.floor(player.pos.x / TILE_SIZE);
    const x1 = Math.floor((player.pos.x + player.w - 1) / TILE_SIZE);
    let isGrounded = false;
    for (let tx = x0; tx <= x1; tx++) {
      if (isSolid(tileAt(tx, feetY))) {
        isGrounded = true;
        break;
      }
    }
    player.grounded = isGrounded;

    // coins
    for (const c of coins) {
      if (!c.taken && rectOverlap(player.pos.x, player.pos.y, player.w, player.h, c.x, c.y, c.w, c.h)) {
        c.taken = true;
        game.score += 100;
      }
    }

    // basic enemies
    for (const e of enemies) {
      if (!e.alive) continue;
      // patrol
      e.vel.x = 1.2 * e.dir;
      // turn on wall or edge
      const aheadX = e.dir > 0 ? Math.floor((e.pos.x + e.w + 1) / TILE_SIZE) : Math.floor((e.pos.x - 1) / TILE_SIZE);
      const footY = Math.floor((e.pos.y + e.h + 1) / TILE_SIZE);
      const sideY = Math.floor((e.pos.y + e.h * 0.5) / TILE_SIZE);
      if (isSolid(tileAt(aheadX, sideY)) || !isSolid(tileAt(aheadX, footY))) e.dir *= -1;

      // gravity
      e.vel.y += GRAVITY * 0.6;

      // move & collide
      resolvePhysicsRect(e);
      
      // collide with player
      if (
        rectOverlap(player.pos.x, player.pos.y, player.w, player.h, e.pos.x, e.pos.y, e.w, e.h)
      ) {
        const fromAbove = player.vel.y > 0 && player.pos.y + player.h - e.pos.y < 16;
        if (fromAbove) {
          e.alive = false;
          player.vel.y = JUMP_VELOCITY * 0.6;
          game.score += 200;
        } else {
          // simple death
          player.alive = false;
          game.status = GameStatus.GameOver;
        }
      }
    }
    
    if (player.pos.y > rows * TILE_SIZE) {
        player.alive = false;
        game.status = GameStatus.GameOver;
    }

    // flag win
    if (flag && rectOverlap(player.pos.x, player.pos.y, player.w, player.h, flag.x, flag.y, flag.w, flag.h)) {
      s.game.status = GameStatus.GameWon;
    }

    // camera follow
    const worldW = cols * TILE_SIZE;
    const targetX = Math.max(0, Math.min(worldW - 960, player.pos.x - 960 * 0.35));
    camera.x += (targetX - camera.x) * 0.12;
  }

  function render(ctx: CanvasRenderingContext2D, s: NonNullable<typeof stateRef.current>) {
    const W = 960, H = 540;
    ctx.clearRect(0, 0, W, H);

    // background sky
    ctx.fillStyle = '#5c94fc';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(-Math.floor(s.camera.x), 0);

    // tiles
    for (let y = 0; y < rows; y++) {
      const row = LEVEL[y];
      for (let x = 0; x < cols; x++) {
        const ch = row.charAt(x);
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        if (ch === '#') {
          ctx.fillStyle = '#d14f28';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#000';
          ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
        } else if (ch === '=') {
           ctx.fillStyle = '#d14f28';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#000';
          ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
        } else if (ch === '?') {
          ctx.fillStyle = '#fbb__f24';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#000';
          ctx.fillText('?', px + TILE_SIZE/2 - 4, py + TILE_SIZE/2 + 4);
        } else if (ch === 'F' && s.flag) {
          ctx.fillStyle = '#9ca3af';
          ctx.fillRect(s.flag.x, s.flag.y, s.flag.w, s.flag.h);
          ctx.fillStyle = '#10b981';
          ctx.fillRect(s.flag.x + 6, s.flag.y + 20, 24, 12);
        }
      }
    }

    // coins
    for (const c of s.coins) {
      if (c.taken) continue;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.ellipse(c.x + 8, c.y + 8, 8, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // enemies
    for (const e of s.enemies) {
      if (!e.alive) continue;
      ctx.fillStyle = '#9a6a23';
      ctx.fillRect(e.pos.x, e.pos.y, e.w, e.h);
    }

    // player
    const p = s.player;
    if (p.alive) {
      ctx.fillStyle = '#e53e3e';
      ctx.fillRect(p.pos.x, p.pos.y, p.w, p.h);
    }

    ctx.restore();

    // HUD
    ctx.fillStyle = '#ffffff';
    ctx.font = "20px 'Press Start 2P'";
    ctx.fillText(`SCORE: ${s.game.score}`, 12, 30);
    ctx.fillText(`STATUS: ${s.game.status}`, 12, 60);
    if (s.game.status !== GameStatus.Playing) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0,0,W,H);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(s.game.status === GameStatus.GameWon ? 'YOU WIN!' : 'GAME OVER', W/2, H/2 - 20);
        ctx.font = "16px 'Press Start 2P'";
        ctx.fillText('Press R to Restart', W/2, H/2 + 20);
    }
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', background: '#111', width: '100vw', height: '100vh' }}>
      <canvas ref={canvasRef} width={960} height={540} style={{ background: 'black', imageRendering: 'pixelated' }} />
      <div style={{ color: 'white', opacity: 0.8, marginTop: 6, fontFamily: "'Press Start 2P', cursive" }}>← → move, ↑/Space jump, R restart</div>
    </div>
  );
}

export default App;
