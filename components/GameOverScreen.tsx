
import React from 'react';

interface GameOverScreenProps {
  score: number;
  onRestart: () => void;
  isWin?: boolean;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ score, onRestart, isWin = false }) => {
  return (
    <div className="w-full h-full bg-black text-white flex flex-col items-center justify-center">
      <h1 className="text-5xl mb-4">{isWin ? 'YOU WIN!' : 'GAME OVER'}</h1>
      <p className="text-2xl mb-8">Final Score: {score}</p>
      <button
        onClick={onRestart}
        className="px-8 py-4 bg-green-500 hover:bg-green-700 text-white font-bold rounded text-2xl"
      >
        Play Again
      </button>
    </div>
  );
};

export default GameOverScreen;
