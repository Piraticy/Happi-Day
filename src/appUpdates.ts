let pending = 0

// A request can outlive the panel that started it; reload must wait for its result.
export async function keepAppOpenUntil<T>(work: PromiseLike<T>): Promise<T> {
  pending++
  try { return await work } finally { pending-- }
}

export function hasPendingAppOperation() { return pending > 0 }
