
import React, { forwardRef } from 'react';
import type { PlayerState } from '../types';
import { TILE_SIZE } from '../constants';

const Player = forwardRef<HTMLDivElement, PlayerState>((_, ref) => {
  const style: React.CSSProperties = {
    width: `${TILE_SIZE}px`,
    height: `${TILE_SIZE}px`,
    zIndex: 10,
    // Positioning and direction scaling are now handled imperatively in the game loop for performance.
  };

  return (
    <div
      ref={ref}
      className="absolute"
      style={style}
    >
        {/* Mario-like character */}
        <div className="absolute w-full h-full flex flex-col items-center">
            {/* Hat */}
            <div className="w-10/12 h-1/3 bg-red-600 rounded-t-sm border-2 border-black"></div>
            {/* Head */}
            <div className="w-full h-2/3 bg-[#f3c784] relative">
                 {/* Overalls */}
                <div className="absolute bottom-0 w-full h-1/2 bg-blue-600"></div>
                 {/* Eye */}
                <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-black rounded-full"></div>
            </div>
        </div>
    </div>
  );
});

export default Player;
