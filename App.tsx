

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Player from './components/Player';
import Level from './components/Level';
import Enemy from './components/Enemy';
import HUD from './components/HUD';
import StartScreen from './components/StartScreen';
import GameOverScreen from './components/GameOverScreen';
import { LEVEL_LAYOUT, TILE_SIZE } from './constants';
// Fix: 'GameStatus' is an enum and used as a value, so it must not be a type-only import.
import type { PlayerState, EnemyState, GameState } from './types';
import { GameStatus } from './types';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    status: GameStatus.NotStarted,
    score: 0,
    lives: 3,
    level: 1,
    time: 400,
  });

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
  const [scrollX, setScrollX] = useState(0);
  const keys = useRef<{ [key: string]: boolean }>({});
  const gameLoopRef = useRef<number>();

  const resetPlayer = useCallback(() => {
    setPlayerState({
      x: TILE_SIZE * 2,
      y: TILE_SIZE * 12,
      vx: 0,
      vy: 0,
      isJumping: false,
      direction: 'right',
      isAlive: true,
    });
  }, []);
  
  const initializeEnemies = useCallback(() => {
    const newEnemies: EnemyState[] = [];
    LEVEL_LAYOUT.forEach((row, r) => {
      // Fix: A string does not have a `forEach` method. It needs to be split into an array of characters first.
      row.split('').forEach((cell, c) => {
        if (cell === 'E') {
          newEnemies.push({
            id: `enemy-${r}-${c}`,
            x: c * TILE_SIZE,
            y: r * TILE_SIZE,
            vx: -0.5,
            isAlive: true,
            direction: 'left',
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
    setScrollX(0);
  };
  
  const handlePlayerDeath = useCallback(() => {
    setPlayerState(prev => ({ ...prev, isAlive: false, vy: -8 })); // Death bounce
    setGameState(prev => ({...prev, lives: prev.lives - 1}));

    setTimeout(() => {
      if (gameState.lives - 1 > 0) {
        resetPlayer();
      } else {
        setGameState(prev => ({...prev, status: GameStatus.GameOver}));
      }
    }, 2000);
  }, [gameState.lives, resetPlayer]);


  const checkCollisions = useCallback((p: PlayerState) => {
    let { x, y, vx, vy, isJumping } = p;
    let onGround = false;

    // World bounds
    if (x + vx < 0) {
      x = 0;
      vx = 0;
    }

    // Check vertical collision
    const playerBottom = y + TILE_SIZE;
    const playerTop = y;
    const playerLeft = x;
    const playerRight = x + TILE_SIZE;

    const checkTile = (px: number, py: number) => {
      const col = Math.floor(px / TILE_SIZE);
      const row = Math.floor(py / TILE_SIZE);
      return LEVEL_LAYOUT[row] && LEVEL_LAYOUT[row][col];
    };
    
    // Vertical collision
    if (vy > 0) { // Moving down
        const leftFoot = checkTile(playerLeft + 1, playerBottom);
        const rightFoot = checkTile(playerRight - 1, playerBottom);
        if (leftFoot && leftFoot !== ' ' && leftFoot !== 'E' || rightFoot && rightFoot !== ' ' && rightFoot !== 'E') {
            y = Math.floor(playerBottom / TILE_SIZE) * TILE_SIZE - TILE_SIZE;
            vy = 0;
            isJumping = false;
            onGround = true;
        }
    } else if (vy < 0) { // Moving up
        const leftHead = checkTile(playerLeft + 1, playerTop);
        const rightHead = checkTile(playerRight - 1, playerTop);
         if (leftHead && leftHead !== ' ' && leftHead !== 'E' || rightHead && rightHead !== ' ' && rightHead !== 'E') {
            y = Math.floor(playerTop / TILE_SIZE + 1) * TILE_SIZE;
            vy = 0;
            // TODO: Hit block logic
        }
    }
    
    // Horizontal collision
    const nextX = x + vx;
    const midLeftY = y + TILE_SIZE / 2;
    const midRightY = y + TILE_SIZE / 2;

    if (vx > 0) { // Moving right
        const head = checkTile(nextX + TILE_SIZE, y + 1);
        const foot = checkTile(nextX + TILE_SIZE, y + TILE_SIZE -1);
        if((head && head !== ' ' && head !== 'E') || (foot && foot !== ' ' && foot !== 'E')) {
            x = Math.floor((nextX + TILE_SIZE) / TILE_SIZE) * TILE_SIZE - TILE_SIZE;
            vx = 0;
        }
    } else if (vx < 0) { // Moving left
        const head = checkTile(nextX, y + 1);
        const foot = checkTile(nextX, y + TILE_SIZE -1);
         if((head && head !== ' ' && head !== 'E') || (foot && foot !== ' ' && foot !== 'E')) {
            x = Math.floor(nextX / TILE_SIZE + 1) * TILE_SIZE;
            vx = 0;
        }
    }
    
    // Fall off screen
    if (y > TILE_SIZE * 15) {
        handlePlayerDeath();
    }
    
    // Win condition
    const endCastleCol = LEVEL_LAYOUT[0].length - 3;
    if (x / TILE_SIZE > endCastleCol) {
        setGameState(prev => ({...prev, status: GameStatus.GameWon}));
    }

    return { x, y, vx, vy, isJumping, onGround };
  }, [handlePlayerDeath]);
  
  const updateEnemies = useCallback(() => {
      setEnemies(prevEnemies => prevEnemies.map(enemy => {
          if (!enemy.isAlive) return enemy;
          
          const nextX = enemy.x + enemy.vx;
          
          const checkTile = (px: number, py: number) => {
            const col = Math.floor(px / TILE_SIZE);
            const row = Math.floor(py / TILE_SIZE);
            return LEVEL_LAYOUT[row] && LEVEL_LAYOUT[row][col];
          };

          // Basic wall collision
          const wallCheckX = enemy.vx < 0 ? nextX : nextX + TILE_SIZE;
          const wallTile = checkTile(wallCheckX, enemy.y + TILE_SIZE / 2);

          if (wallTile && wallTile !== ' ' && wallTile !== 'E') {
            return { ...enemy, vx: -enemy.vx, direction: enemy.direction === 'left' ? 'right' : 'left' };
          }
          
          // Edge detection
          const groundCheckX = enemy.vx < 0 ? nextX : nextX + TILE_SIZE;
          const groundTile = checkTile(groundCheckX, enemy.y + TILE_SIZE);
          if (!groundTile || groundTile === ' ' || groundTile === 'E') {
              return { ...enemy, vx: -enemy.vx, direction: enemy.direction === 'left' ? 'right' : 'left' };
          }

          return { ...enemy, x: nextX };
      }));
  }, []);

  const checkEnemyCollisions = useCallback(() => {
    if (!playerState.isAlive) return;

    const playerBottom = playerState.y + TILE_SIZE;
    const playerMidX = playerState.x + TILE_SIZE / 2;

    setEnemies(prevEnemies => {
        const newEnemies = [...prevEnemies];
        let playerHit = false;

        newEnemies.forEach((enemy, index) => {
            if (!enemy.isAlive) return;

            const enemyLeft = enemy.x;
            const enemyRight = enemy.x + TILE_SIZE;
            const enemyTop = enemy.y;

            const isOverlappingX = playerState.x < enemyRight && playerState.x + TILE_SIZE > enemyLeft;
            const isOverlappingY = playerState.y < enemy.y + TILE_SIZE && playerState.y + TILE_SIZE > enemy.y;
            
            if (isOverlappingX && isOverlappingY) {
                // Stomp check
                const isStomping = playerState.vy > 0 && playerBottom < enemyTop + TILE_SIZE / 2;
                if (isStomping) {
                    newEnemies[index].isAlive = false;
                    setPlayerState(p => ({...p, vy: -5})); // Bounce
                    setGameState(g => ({...g, score: g.score + 100}));
                } else {
                    playerHit = true;
                }
            }
        });

        if (playerHit) {
            handlePlayerDeath();
        }

        return newEnemies;
    });
  }, [playerState.x, playerState.y, playerState.vy, playerState.isAlive, handlePlayerDeath]);

  const gameLoop = useCallback(() => {
    // Player Movement
    setPlayerState(p => {
        if (!p.isAlive) {
            // Dead physics
            return {...p, y: p.y + p.vy, vy: p.vy + 0.5};
        }
        
        let newVx = p.vx;
        const maxSpeed = 3;
        const acceleration = 0.3;
        const friction = 0.9;
        
        if (keys.current.ArrowLeft) {
            newVx = Math.max(newVx - acceleration, -maxSpeed);
        } else if (keys.current.ArrowRight) {
            newVx = Math.min(newVx + acceleration, maxSpeed);
        } else {
            newVx *= friction;
            if (Math.abs(newVx) < 0.1) newVx = 0;
        }

        let newVy = p.vy + 0.4; // Gravity
        
        const direction = newVx > 0 ? 'right' : newVx < 0 ? 'left' : p.direction;
        
        let { x, y, vx, vy, isJumping } = checkCollisions({ ...p, vx: newVx, vy: newVy});

        if (keys.current.ArrowUp && !p.isJumping) {
            vy = -9;
            isJumping = true;
        }

        return { ...p, x, y, vx, vy, isJumping, direction };
    });

    updateEnemies();
    checkEnemyCollisions();

    // Update camera scroll
    setScrollX(prevScrollX => {
        const playerScreenX = playerState.x - prevScrollX;
        const rightThreshold = window.innerWidth * 0.6;
        const leftThreshold = window.innerWidth * 0.4;

        if (playerScreenX > rightThreshold) {
            return playerState.x - rightThreshold;
        }
        if (playerScreenX < leftThreshold) {
            return Math.max(0, playerState.x - leftThreshold);
        }
        return prevScrollX;
    });

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [checkCollisions, playerState.x, playerState.isAlive, updateEnemies, checkEnemyCollisions]);


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
    if (gameState.status !== GameStatus.Playing) {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      return;
    }

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
              <div
                className="absolute top-0 left-0 transition-transform duration-100 ease-linear"
                style={{ transform: `translateX(-${scrollX}px)` }}
              >
                <Level />
                <Player {...playerState} />
                {enemies.map(enemy => (
                  <Enemy key={enemy.id} {...enemy} />
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