export class TimeoutError extends Error {
  timeoutMs: number;
  label?: string;

  constructor(timeoutMs: number, label?: string) {
    super('Timeout');
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
    this.label = label;
  }
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label?: string): Promise<T> {
  let t: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    t = setTimeout(() => reject(new TimeoutError(timeoutMs, label)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(t);
  }
}

