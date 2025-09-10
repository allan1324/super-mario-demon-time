
import React from 'react';
import type { EnemyState } from '../types';
import { TILE_SIZE } from '../constants';

const Enemy: React.FC<EnemyState> = ({ x, y, isAlive }) => {
  if (!isAlive) {
    return (
       <div
        className="absolute bg-orange-900 border-2 border-black"
        style={{
          left: `${x}px`,
          top: `${y + TILE_SIZE / 2}px`,
          width: `${TILE_SIZE}px`,
          height: `${TILE_SIZE / 2}px`,
          zIndex: 5,
        }}
      ></div>
    )
  }

  return (
    <div
      className="absolute"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${TILE_SIZE}px`,
        height: `${TILE_SIZE}px`,
        zIndex: 5,
      }}
    >
        {/* Goomba-like character */}
        <div className="w-full h-full bg-orange-800 rounded-t-full relative border-x-2 border-t-2 border-black">
            {/* Eyes */}
            <div className="absolute top-1/3 w-full flex justify-around">
                <div className="w-3 h-4 bg-white border border-black transform -rotate-12">
                    <div className="w-1.5 h-1.5 bg-black"></div>
                </div>
                <div className="w-3 h-4 bg-white border border-black transform rotate-12">
                     <div className="w-1.5 h-1.5 bg-black"></div>
                </div>
            </div>
            {/* Feet */}
            <div className="absolute bottom-[-2px] w-full flex justify-between">
                <div className="w-1/3 h-2 bg-black rounded-b-sm"></div>
                <div className="w-1/3 h-2 bg-black rounded-b-sm"></div>
            </div>
        </div>
    </div>
  );
};

export default Enemy;
