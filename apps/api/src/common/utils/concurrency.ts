/**
 * Maps over items with a bounded number of in-flight promises. Use for
 * fan-out calls to external services (e.g. signing storage URLs) where an
 * unbounded Promise.all over hundreds of rows would open that many
 * concurrent requests to the backend on a single incoming request.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
