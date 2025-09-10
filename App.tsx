
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Player from './components/Player';
import Level from './components/Level';
import Enemy from './components/Enemy';
import HUD from './components/HUD';
import StartScreen from './components/StartScreen';
import GameOverScreen from './components/GameOverScreen';
import { LEVEL_LAYOUT, TILE_SIZE } from './constants';
import { GameStatus } from './types';
import type { PlayerState, EnemyState, GameState } from './types';

// Represents the mutable, high-frequency state of a game object.
// This is managed outside of React state for performance.
interface GameObject {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    status: GameStatus.NotStarted,
    score: 0,
    lives: 3,
    level: 1,
    time: 400,
  });

  // React state for player now primarily handles non-positional state (direction, alive status)
  // and serves as initial state for the physics simulation.
  const [playerState, setPlayerState] = useState<PlayerState>({
    x: TILE_SIZE * 2,
    y: TILE_SIZE * 12,
    vx: 0,
    vy: 0,
    isJumping: false,
    direction: 'right',
    isAlive: true,
  });
  
  const [enemies, setEnemies] = useState<EnemyState[]>([]);
  
  // Refs for direct DOM manipulation
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const enemyRefs = useRef(new Map<string, HTMLDivElement | null>());

  // Ref to hold all high-frequency game state (positions, velocities)
  // This is the core of the performance optimization.
  const gameLogicRef = useRef({
    player: { x: 0, y: 0, vx: 0, vy: 0 },
    enemies: new Map<string, GameObject>(),
    cameraX: 0,
  });

  const keys = useRef<{ [key: string]: boolean }>({});
  // FIX: Initialize useRef with null and update the type to handle the initial null value.
  const gameLoopRef = useRef<number | null>(null);

  const resetPlayer = useCallback(() => {
    const initialPlayerState: PlayerState = {
      x: TILE_SIZE * 2,
      y: TILE_SIZE * 12,
      vx: 0,
      vy: 0,
      isJumping: false,
      direction: 'right',
      isAlive: true,
    };
    setPlayerState(initialPlayerState);
    gameLogicRef.current.player = {
        x: initialPlayerState.x,
        y: initialPlayerState.y,
        vx: 0,
        vy: 0,
    };
  }, []);
  
  const initializeEnemies = useCallback(() => {
    const newEnemies: EnemyState[] = [];
    gameLogicRef.current.enemies.clear();
    LEVEL_LAYOUT.forEach((row, r) => {
      row.split('').forEach((cell, c) => {
        if (cell === 'E') {
          const id = `enemy-${r}-${c}`;
          const enemyState: EnemyState = {
            id,
            x: c * TILE_SIZE,
            y: r * TILE_SIZE,
            vx: -0.5,
            isAlive: true,
            direction: 'left',
          };
          newEnemies.push(enemyState);
          gameLogicRef.current.enemies.set(id, {
              x: enemyState.x,
              y: enemyState.y,
              vx: enemyState.vx,
              vy: 0,
          });
        }
      });
    });
    setEnemies(newEnemies);
  }, []);

  const startGame = () => {
    setGameState({
      status: GameStatus.Playing,
      score: 0,
      lives: 3,
      level: 1,
      time: 400,
    });
    resetPlayer();
    initializeEnemies();
    gameLogicRef.current.cameraX = 0;
  };
  
  const handlePlayerDeath = useCallback(() => {
    if (!playerState.isAlive) return; // Prevent multiple death triggers

    setPlayerState(prev => ({ ...prev, isAlive: false }));
    gameLogicRef.current.player.vy = -8; // Death bounce
    setGameState(prev => ({...prev, lives: prev.lives - 1}));

    setTimeout(() => {
      if (gameState.lives - 1 > 0) {
        resetPlayer();
      } else {
        setGameState(prev => ({...prev, status: GameStatus.GameOver}));
      }
    }, 2000);
  }, [gameState.lives, resetPlayer, playerState.isAlive]);


  const checkCollisions = useCallback((x: number, y: number, vx: number, vy: number) => {
    let onGround = false;

    // World bounds
    if (x + vx < 0) {
      x = 0;
      vx = 0;
    }

    const checkTile = (px: number, py: number) => {
      if (py < 0) return null; // No tiles above the map
      const col = Math.floor(px / TILE_SIZE);
      const row = Math.floor(py / TILE_SIZE);
      return LEVEL_LAYOUT[row] && LEVEL_LAYOUT[row][col];
    };
    
    // Vertical collision
    const playerBottom = y + TILE_SIZE;
    if (vy > 0) { 
        const leftFoot = checkTile(x + 1, playerBottom + vy);
        const rightFoot = checkTile(x + TILE_SIZE - 1, playerBottom + vy);
        if ((leftFoot && leftFoot !== ' ') || (rightFoot && rightFoot !== ' ')) {
            y = Math.floor(playerBottom / TILE_SIZE) * TILE_SIZE - TILE_SIZE;
            vy = 0;
            onGround = true;
        }
    } else if (vy < 0) {
        const leftHead = checkTile(x + 1, y + vy);
        const rightHead = checkTile(x + TILE_SIZE - 1, y + vy);
         if ((leftHead && leftHead !== ' ') || (rightHead && rightHead !== ' ')) {
            y = Math.floor((y + vy) / TILE_SIZE + 1) * TILE_SIZE;
            vy = 0;
        }
    }
    
    // Horizontal collision
    const nextX = x + vx;
    if (vx > 0) {
        const head = checkTile(nextX + TILE_SIZE, y + 1);
        const foot = checkTile(nextX + TILE_SIZE, y + TILE_SIZE -1);
        if((head && head !== ' ') || (foot && foot !== ' ')) {
            x = Math.floor((nextX + TILE_SIZE) / TILE_SIZE) * TILE_SIZE - TILE_SIZE;
            vx = 0;
        }
    } else if (vx < 0) {
        const head = checkTile(nextX, y + 1);
        const foot = checkTile(nextX, y + TILE_SIZE -1);
         if((head && head !== ' ') || (foot && foot !== ' ')) {
            x = Math.floor(nextX / TILE_SIZE + 1) * TILE_SIZE;
            vx = 0;
        }
    }
    
    return { x, y, vx, vy, onGround };
  }, []);
  
  const gameLoop = useCallback(() => {
    if (gameState.status !== GameStatus.Playing) return;

    const logic = gameLogicRef.current;
    
    // === Player Logic ===
    if (playerState.isAlive) {
      let { vx, vy } = logic.player;
      const maxSpeed = 3;
      const acceleration = 0.3;
      const friction = 0.9;
      
      if (keys.current.ArrowLeft) {
          vx = Math.max(vx - acceleration, -maxSpeed);
      } else if (keys.current.ArrowRight) {
          vx = Math.min(vx + acceleration, maxSpeed);
      } else {
          vx *= friction;
          if (Math.abs(vx) < 0.1) vx = 0;
      }

      vy += 0.4; // Gravity

      const newDirection = vx > 0 ? 'right' : vx < 0 ? 'left' : playerState.direction;
      if (newDirection !== playerState.direction) {
          setPlayerState(p => ({ ...p, direction: newDirection }));
      }
      
      const collisionResult = checkCollisions(logic.player.x, logic.player.y, vx, vy);
      logic.player.x = collisionResult.x;
      logic.player.y = collisionResult.y;
      logic.player.vx = collisionResult.vx;
      logic.player.vy = collisionResult.vy;

      if (keys.current.ArrowUp && collisionResult.onGround) {
          logic.player.vy = -9;
      }
    } else {
      // Dead physics
      logic.player.vy += 0.5;
      logic.player.y += logic.player.vy;
    }
    
    // Fall off screen check
    if (logic.player.y > TILE_SIZE * 15) {
        handlePlayerDeath();
    }
    
    // Win condition
    const endCastleCol = LEVEL_LAYOUT[0].length - 3;
    if (logic.player.x / TILE_SIZE > endCastleCol) {
        setGameState(prev => ({...prev, status: GameStatus.GameWon}));
    }

    // === Enemy Logic ===
    const aliveEnemies = enemies.filter(e => e.isAlive);
    for (const enemy of aliveEnemies) {
        const enemyLogic = logic.enemies.get(enemy.id);
        if (!enemyLogic) continue;

        let { x, vx } = enemyLogic;
        x += vx;

        const checkTile = (px: number, py: number) => {
          const col = Math.floor(px / TILE_SIZE);
          const row = Math.floor(py / TILE_SIZE);
          return LEVEL_LAYOUT[row] && LEVEL_LAYOUT[row][col];
        };

        const wallCheckX = vx < 0 ? x : x + TILE_SIZE;
        const wallTile = checkTile(wallCheckX, enemy.y + TILE_SIZE / 2);
        const groundCheckX = vx < 0 ? x : x + TILE_SIZE;
        const groundTile = checkTile(groundCheckX, enemy.y + TILE_SIZE);

        if ((wallTile && wallTile !== ' ') || !groundTile || groundTile === ' ') {
          vx = -vx;
          setEnemies(prev => prev.map(e => e.id === enemy.id ? {...e, direction: e.direction === 'left' ? 'right' : 'left'} : e));
        }

        enemyLogic.x = x;
        enemyLogic.vx = vx;
    }

    // === Player-Enemy Collision ===
    if (playerState.isAlive) {
      const playerBottom = logic.player.y + TILE_SIZE;
      for (const enemy of aliveEnemies) {
          const enemyLogic = logic.enemies.get(enemy.id);
          if (!enemyLogic) continue;

          const isOverlappingX = logic.player.x < enemyLogic.x + TILE_SIZE && logic.player.x + TILE_SIZE > enemyLogic.x;
          const isOverlappingY = logic.player.y < enemy.y + TILE_SIZE && playerBottom > enemy.y;

          if (isOverlappingX && isOverlappingY) {
              const isStomping = logic.player.vy > 0 && playerBottom < enemy.y + TILE_SIZE / 2;
              if (isStomping) {
                  setEnemies(prev => prev.map(e => e.id === enemy.id ? {...e, isAlive: false} : e));
                  logic.player.vy = -5; // Bounce
                  setGameState(g => ({...g, score: g.score + 100}));
              } else {
                  handlePlayerDeath();
                  break; 
              }
          }
      }
    }
    
    // === Camera and DOM updates ===
    const targetScrollX = Math.max(0, logic.player.x - window.innerWidth * 0.4);
    logic.cameraX += (targetScrollX - logic.cameraX) * 0.1; // Smooth lerp

    if (playerRef.current) {
        const scaleX = playerState.direction === 'left' ? -1 : 1;
        const rotation = !playerState.isAlive ? 'rotate(180deg)' : '';
        playerRef.current.style.transform = `translate(${logic.player.x}px, ${logic.player.y}px) scaleX(${scaleX}) ${rotation}`;
    }

    for (const enemy of enemies) {
        const enemyDomRef = enemyRefs.current.get(enemy.id);
        const enemyLogic = logic.enemies.get(enemy.id);
        if (enemyDomRef && enemyLogic) {
          if (enemy.isAlive) {
            enemyDomRef.style.transform = `translate(${enemyLogic.x}px, ${enemy.y}px)`;
          } else {
            // position the squashed goomba
            enemyDomRef.style.transform = `translate(${enemyLogic.x}px, ${enemy.y + TILE_SIZE / 2}px)`;
          }
        }
    }

    if (gameContainerRef.current) {
        gameContainerRef.current.style.transform = `translateX(-${logic.cameraX}px)`;
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState.status, playerState.isAlive, playerState.direction, enemies, checkCollisions, handlePlayerDeath]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.key] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.key] = false; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    if (gameState.status === GameStatus.Playing) {
        gameLoopRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.status, gameLoop]);
  
  useEffect(() => {
    if (gameState.status !== GameStatus.Playing) return;
    const timer = setInterval(() => {
      setGameState(prev => {
        if (prev.time > 0) {
          return { ...prev, time: prev.time - 1 };
        } else {
          handlePlayerDeath();
          return prev;
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState.status, handlePlayerDeath]);

  const renderGameContent = () => {
    switch (gameState.status) {
      case GameStatus.NotStarted:
        return <StartScreen onStart={startGame} />;
      case GameStatus.GameOver:
        return <GameOverScreen score={gameState.score} onRestart={startGame} />;
      case GameStatus.GameWon:
        return <GameOverScreen score={gameState.score} onRestart={startGame} isWin={true}/>
      case GameStatus.Playing:
        return (
          <>
            <HUD score={gameState.score} lives={gameState.lives} time={gameState.time} level={gameState.level} />
            <div className="relative w-full h-full overflow-hidden">
              <div ref={gameContainerRef} className="absolute top-0 left-0">
                <Level />
                <Player ref={playerRef} {...playerState} />
                {enemies.map(enemy => (
                  <Enemy 
                    key={enemy.id} 
                    // FIX: Use a block statement for the ref callback to prevent it from returning a value.
                    ref={el => { enemyRefs.current.set(enemy.id, el); }} 
                    {...enemy} 
                  />
                ))}
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="w-screen h-screen bg-[#5c94fc] flex items-center justify-center font-['Press_Start_2P']">
      <div className="w-[1024px] h-[576px] bg-black relative">
        {renderGameContent()}
      </div>
    </div>
  );
};

export default App;
