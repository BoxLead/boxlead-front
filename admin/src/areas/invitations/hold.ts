export type Hold = () => () => void;

export async function whileHeld<T>(hold: Hold, work: () => Promise<T>): Promise<T> {
  const release = hold();
  try {
    return await work();
  } finally {
    release();
  }
}
