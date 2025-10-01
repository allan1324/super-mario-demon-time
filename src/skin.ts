
// src/skin.ts
export type SpriteDef = {
  src: string;            // image path
  frameW: number;         // frame width in px
  frameH: number;         // frame height in px
  animations: {
    [name: string]: { frames: number[]; fps: number; loop: boolean }
  };
  scale?: number;         // 1 = match hitbox height, apply aspect by frameW/H
  offsetX?: number;       // px offset from hitbox left
  offsetY?: number;       // px offset from hitbox top
  anchor?: 'bottom'|'center'|'top'; // how to align sprite to hitbox
};

export type SkinConfig = {
  name: string;
  player?: SpriteDef;
  enemyGoomba?: SpriteDef;
  enemyKoopa?: SpriteDef;
  enemyPiranha?: SpriteDef;
  enemyHammerBro?: SpriteDef;
  enemyLakitu?: SpriteDef;
  enemySpiny?: SpriteDef;
  powerUpMushroom?: SpriteDef;
  powerUpFireFlower?: SpriteDef;
  powerUpStar?: SpriteDef;
  fireball?: SpriteDef;
  hammer?: SpriteDef;
  tiles?: SpriteDef;
  palette?: { bg?: string };
};

export type SkinPack = {
  key: string;
  config: SkinConfig;
  images: Record<string, HTMLImageElement>;
};

export async function loadSkin(key: string): Promise<SkinPack> {
  const url = `/skins/${key}/skin.json`;
  const res = await fetch(url);
  const config: SkinConfig = await res.json();

  const images: Record<string, HTMLImageElement> = {};
  const toLoad: Array<[string, string]> = [];

  const spriteConfigs: (keyof SkinConfig)[] = ['player', 'enemyGoomba', 'enemyKoopa', 'enemyPiranha', 'enemyHammerBro', 'enemyLakitu', 'enemySpiny', 'powerUpMushroom', 'powerUpFireFlower', 'powerUpStar', 'fireball', 'hammer', 'tiles'];

  for (const configKey of spriteConfigs) {
      const spriteDef = config[configKey] as SpriteDef | undefined;
      if (spriteDef?.src) {
        toLoad.push([configKey, `/skins/${key}/${spriteDef.src}`]);
      }
  }

  await Promise.all(toLoad.map(([k, src]) => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => { images[k] = img; resolve(); };
      img.onerror = () => resolve(); // fail soft -> fallback rects
      img.src = src;
    });
  }));

  return { key, config, images };
}

export function drawSprite(ctx: CanvasRenderingContext2D, img: HTMLImageElement, def: SpriteDef, anim: string, t: number, x: number, y: number, w: number, h: number) {
  const a = def.animations[anim] ?? def.animations['idle'] ?? Object.values(def.animations)[0];
  if (!a) return;

  const frames = a.frames.length ? a.frames : [0];
  const idx = a.loop ? Math.floor(t * a.fps) % frames.length : Math.min(Math.floor(t * a.fps), frames.length - 1);
  const frame = frames[idx];

  const sx = (frame * def.frameW);
  const sy = 0;
  const sw = def.frameW, sh = def.frameH;

  const scale = def.scale ?? (h / sh);
  const dw = sw * scale;
  const dh = sh * scale;

  let dx = x + (def.offsetX ?? 0);
  let dy = y + (def.offsetY ?? 0);

  if (def.anchor === 'center') {
    dx = x + (w - dw)/2;
    dy = y + (h - dh)/2;
  } else if (def.anchor === 'bottom' || !def.anchor) {
    dx = x + (w - dw)/2;
    dy = y + (h - dh);
  }

  ctx.drawImage(img, sx, sy, sw, sh, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
}