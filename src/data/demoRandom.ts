function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type Random = () => number;

export function seeded(seed: string): Random {
  let state = hash(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(weights: number[], roll: number): number {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let threshold = roll * total;
  for (let i = 0; i < weights.length; i++) {
    threshold -= weights[i];
    if (threshold < 0) return i;
  }
  return weights.length - 1;
}

export function poisson(mean: number, next: Random): number {
  const limit = Math.exp(-mean);
  let count = 0;
  let product = next();
  while (product > limit) {
    count++;
    product *= next();
  }
  return count;
}

export function gammaNoise(shape: number, next: Random): number {
  let total = 0;
  for (let i = 0; i < shape; i++) total -= Math.log(1 - next());
  return total / shape;
}
