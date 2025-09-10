
import React from 'react';

interface HUDProps {
  score: number;
  lives: number;
  time: number;
  level: number;
}

const HUD: React.FC<HUDProps> = ({ score, lives, time, level }) => {
  return (
    <div className="absolute top-0 left-0 w-full p-4 text-white text-lg z-20 flex justify-between">
      <div>
        <p>MARIO</p>
        <p>{score.toString().padStart(6, '0')}</p>
      </div>
      <div>
        <p>LIVES</p>
        <p className="text-center">{lives}</p>
      </div>
      <div>
        <p>LEVEL</p>
        <p className="text-center">{level}</p>
      </div>
      <div>
        <p>TIME</p>
        <p>{time}</p>
      </div>
    </div>
  );
};

export default HUD;
