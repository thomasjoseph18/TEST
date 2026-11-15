// Procedural textures, generated once and cached. Nothing is downloaded, so there are no asset
// licences to worry about and the game works offline.
import * as THREE from 'three';
import { fbm, rng, valueNoise } from './terrain';

const cache = new Map<string, THREE.CanvasTexture>();

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return [c, ctx];
}

function finish(c: HTMLCanvasElement, srgb = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

/** Equirectangular noise sampled on a sphere so the seam wraps cleanly. */
function sphereNoise(u: number, v: number, scale: number, seed: number, oct = 4): number {
  const lon = u * Math.PI * 2;
  const lat = (v - 0.5) * Math.PI;
  const x = Math.cos(lat) * Math.cos(lon) * scale;
  const y = Math.sin(lat) * scale;
  const z = Math.cos(lat) * Math.sin(lon) * scale;
  // 3D value noise via two 2D slices: good enough for planet-scale blobs
  return (fbm(x + y * 1.7, z + y * 0.9, seed, oct) + fbm(y + z * 1.3, x - z * 0.7, seed + 31, oct)) * 0.5;
}

export function earthTexture(): THREE.CanvasTexture {
  const hit = cache.get('earth');
  if (hit) return hit;
  const W = 512, H = 256;
  const [c, ctx] = canvas(W, H);
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H;
      const land = sphereNoise(u, v, 2.4, 5, 5);
      const cloud = sphereNoise(u, v, 4.5, 77, 4);
      const lat = Math.abs(v - 0.5) * 2;
      let r: number, g: number, b: number;
      if (land > 0.06) {
        const dry = Math.max(0, 1 - Math.abs(lat - 0.35) * 3);
        const t = Math.min(1, (land - 0.06) * 3);
        r = 52 + dry * 120 + t * 20; g = 100 + dry * 60 - t * 20; b = 52 + dry * 20;
      } else {
        const d = Math.min(1, (0.06 - land) * 4);
        r = 12 + (1 - d) * 22; g = 52 + (1 - d) * 50; b = 120 + (1 - d) * 60;
      }
      const ice = Math.max(0, (lat - 0.86) * 8);
      const cl = Math.max(0, cloud - 0.02) * 2.2;
      const mix = Math.min(1, ice + cl * 0.8);
      r += (245 - r) * mix; g += (248 - g) * mix; b += (252 - b) * mix;
      const i = (y * W + x) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = finish(c);
  cache.set('earth', t);
  return t;
}

export function moonGlobeTexture(): THREE.CanvasTexture {
  const hit = cache.get('moon');
  if (hit) return hit;
  const W = 512, H = 256;
  const [c, ctx] = canvas(W, H);
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H;
      const hi = sphereNoise(u, v, 6, 9, 5);
      const maria = sphereNoise(u, v, 1.6, 41, 3) > 0.05 ? 0.62 : 1;
      const g = (150 + hi * 70) * maria;
      const i = (y * W + x) * 4;
      img.data[i] = g; img.data[i + 1] = g * 0.99; img.data[i + 2] = g * 0.96; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const rand = rng(77);
  for (let k = 0; k < 220; k++) {
    const x = rand() * W, y = H * 0.08 + rand() * H * 0.84, r = 1.5 + Math.pow(rand(), 3) * 12;
    const grad = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.2, x, y, r);
    grad.addColorStop(0, 'rgba(60,60,58,0.35)');
    grad.addColorStop(0.8, 'rgba(60,60,58,0.12)');
    grad.addColorStop(1, 'rgba(240,240,235,0.35)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  const t = finish(c);
  cache.set('moon', t);
  return t;
}

export function marsGlobeTexture(): THREE.CanvasTexture {
  const hit = cache.get('mars');
  if (hit) return hit;
  const W = 512, H = 256;
  const [c, ctx] = canvas(W, H);
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H;
      const n = sphereNoise(u, v, 3.2, 13, 5);
      const dark = sphereNoise(u, v, 2, 88, 3) > 0.08 ? 0.62 : 1;
      const lat = Math.abs(v - 0.5) * 2;
      let r = (176 + n * 70) * dark, g = (92 + n * 40) * dark, b = (56 + n * 24) * dark;
      const cap = Math.max(0, (lat - 0.9) * 10);
      r += (240 - r) * Math.min(1, cap); g += (236 - g) * Math.min(1, cap); b += (232 - b) * Math.min(1, cap);
      const i = (y * W + x) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = finish(c);
  cache.set('mars', t);
  return t;
}

/** Tileable greyscale grain used as bump + colour detail on terrain so the ground looks sharp up close. */
export function groundDetail(kind: 'moon' | 'mars'): THREE.CanvasTexture {
  const key = `detail-${kind}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const S = 256;
  const [c, ctx] = canvas(S, S);
  const img = ctx.createImageData(S, S);
  // Wrap by blending noise with an offset copy of itself so the tile has no visible seam.
  const sample = (x: number, y: number, seed: number) => {
    let sum = 0, amp = 0.5, f = 8 / S, norm = 0;
    for (let o = 0; o < 5; o++) {
      sum += valueNoise(x * f, y * f, seed + o) * amp; norm += amp; amp *= 0.55; f *= 2;
    }
    return sum / norm;
  };
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const wx = x / S, wy = y / S;
      const a = sample(x, y, 3), b = sample(x - S, y, 3), cc = sample(x, y - S, 3), d = sample(x - S, y - S, 3);
      const v = (a * (1 - wx) + b * wx) * (1 - wy) + (cc * (1 - wx) + d * wx) * wy;
      const speck = valueNoise(x * 0.9, y * 0.9, 91) > 0.82 ? 0.14 : 0;
      const g = Math.max(0, Math.min(1, v * 1.25 - 0.12 + speck - valueNoise(x * 0.35, y * 0.35, 5) * 0.1));
      const i = (y * S + x) * 4;
      const tone = kind === 'moon' ? 120 + g * 135 : 110 + g * 140;
      img.data[i] = tone; img.data[i + 1] = tone; img.data[i + 2] = tone; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = finish(c, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  cache.set(key, t);
  return t;
}

/** Soft round sprite used for dust, glows and the Sun. */
export function glowSprite(): THREE.CanvasTexture {
  const hit = cache.get('glow');
  if (hit) return hit;
  const [c, ctx] = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = finish(c);
  cache.set('glow', t);
  return t;
}

export function disposeTextures(): void {
  cache.forEach((t) => t.dispose());
  cache.clear();
}
