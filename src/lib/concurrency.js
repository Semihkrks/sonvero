export async function forEachLimited(items, limit, worker) {
  const queue = [...items];
  const runners = Array.from({ length: Math.max(1, Math.min(limit, queue.length)) }, async () => {
    while (queue.length) await worker(queue.shift());
  });
  await Promise.all(runners);
}
