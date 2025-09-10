
import React from 'react';
import { LEVEL_LAYOUT, TILE_SIZE } from '../constants';

const Tile: React.FC<{ type: string; x: number; y: number }> = ({ type, x, y }) => {
  const style = {
    left: `${x}px`,
    top: `${y}px`,
    width: `${TILE_SIZE}px`,
    height: `${TILE_SIZE}px`,
  };

  const getTileComponent = () => {
    switch (type) {
      case 'G':
        return <div className="absolute bg-[#9a6a23] border-t-4 border-l-4 border-[#c7913e] border-r-4 border-b-4 border-black box-border" style={style}>
            <div className="w-full h-1/3 bg-[#69e037]"></div>
        </div>;
      case 'D':
        return <div className="absolute bg-[#9a6a23] border-t-2 border-l-2 border-[#c7913e] border-r-2 border-b-2 border-black box-border" style={style}></div>;
      case 'B':
        return <div className="absolute bg-[#d14f28] border-2 border-black flex flex-wrap" style={style}>
            <div className="w-1/2 h-1/2 border-r border-b border-black/50"></div>
            <div className="w-1/2 h-1/2 border-b border-black/50"></div>
            <div className="w-1/2 h-1/2 border-r border-black/50"></div>
        </div>;
      case '?':
        return <div className="absolute bg-yellow-400 border-2 border-black flex items-center justify-center text-white font-bold text-2xl" style={style}>?</div>;
      case 'P':
        return <div className="absolute bg-green-600 border-2 border-black" style={{ ...style, height: `${TILE_SIZE * 2}px` }}>
            <div className="w-full h-4 bg-green-500 border-b-2 border-black"></div>
        </div>;
      case 'C':
        return <div className="absolute" style={{...style, width: `${TILE_SIZE * 5}px`, height: `${TILE_SIZE * 5}px`, top: `${y - TILE_SIZE * 4}px`}}>
            <div className="absolute bottom-0 w-full h-full bg-gray-300 border-2 border-black">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-8 bg-red-600 border-2 border-black"></div>
                <div className="absolute w-full top-0 flex justify-around">
                    <div className="w-1/4 h-8 bg-gray-400 border-2 border-black"></div>
                    <div className="w-1/4 h-8 bg-gray-400 border-2 border-black"></div>
                </div>
                <div className="absolute bottom-0 w-1/3 h-1/3 bg-black left-1/2 -translate-x-1/2"></div>
            </div>
        </div>
      default:
        return null;
    }
  };

  return getTileComponent();
};

const Level: React.FC = () => {
  return (
    <div className="relative">
      {LEVEL_LAYOUT.map((row, r) =>
        row.split('').map((cell, c) => {
          if (cell === ' ' || cell === 'E') return null; // Enemies are rendered separately
          return <Tile key={`${r}-${c}`} type={cell} x={c * TILE_SIZE} y={r * TILE_SIZE} />;
        })
      )}
    </div>
  );
};

export default Level;
