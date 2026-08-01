// A minimal per-process cache with in-flight request coalescing. Concurrent callers for
// the same key while a fetch is already running share that one promise instead of each
// triggering their own database query — this is what actually prevents a burst of
// simultaneous requests from stampeding the database on a cold cache. (Next's own
// `unstable_cache` was tried first but didn't coalesce reliably under concurrent load in
// testing — unsurprising given the name.)
//
// This is process-local: on serverless, each warm instance has its own cache, so it
// won't dedupe across instances. It still meaningfully helps, since it collapses
// whatever concurrent requests land on the same instance — which is exactly the
// scenario that caused real failures in load testing.
const store = new Map<string, { value: unknown; expires: number }>();
const inFlight = new Map<string, Promise<unknown>>();

export function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const entry = store.get(key);
  if (entry && entry.expires > Date.now()) {
    return Promise.resolve(entry.value as T);
  }

  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = fn()
    .then((value) => {
      store.set(key, { value, expires: Date.now() + ttlMs });
      inFlight.delete(key);
      return value;
    })
    .catch((err) => {
      inFlight.delete(key);
      throw err;
    });

  inFlight.set(key, promise);
  return promise;
}
