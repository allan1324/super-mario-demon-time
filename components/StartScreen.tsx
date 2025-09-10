
import React from 'react';

interface StartScreenProps {
  onStart: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  return (
    <div className="w-full h-full bg-black text-white flex flex-col items-center justify-center">
      <h1 className="text-5xl mb-4">Super React World</h1>
      <p className="text-xl mb-8">A Mario Clone</p>
      <button
        onClick={onStart}
        className="px-8 py-4 bg-blue-500 hover:bg-blue-700 text-white font-bold rounded text-2xl animate-pulse"
      >
        Start Game
      </button>
      <div className="mt-12 text-center">
        <h2 className="text-lg mb-2">Controls</h2>
        <p>Left/Right Arrow Keys: Move</p>
        <p>Up Arrow Key: Jump</p>
      </div>
    </div>
  );
};

export default StartScreen;
