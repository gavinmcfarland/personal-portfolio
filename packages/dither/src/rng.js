/* A dither has to be reproducible: the same seed must always paint the
   same field, or a texture you liked is gone the moment you reload. So the
   generator never touches Math.random — it draws every decision from this
   small deterministic stream. */

/* Fold an arbitrary seed (string or number) into a 32-bit integer. */
export function hashSeed(seed) {
  if (typeof seed === 'number') return seed >>> 0;
  const str = String(seed);
  let h = 2166136261 >>> 0; // FNV-1a
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* mulberry32 — tiny, fast, good enough for picking tile sizes and masks. */
export function makeRng(seed) {
  let a = hashSeed(seed);
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    /* float in [0, 1) */
    next,
    /* integer in [min, max] inclusive */
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    /* pick one member of a list */
    pick: (list) => list[Math.floor(next() * list.length)],
    /* true with probability p */
    chance: (p) => next() < p,
  };
}

/* A short human-facing label derived from the seed, so a texture you like
   can be found again: "dither-1a2b". */
export function seedLabel(seed) {
  return 'dither-' + hashSeed(seed).toString(16).padStart(8, '0').slice(0, 4);
}
