/**
 * Test utility functions for Lambda tests
 */

/**
 * Mock environment variables for tests
 */
export function mockEnvironment(vars: Record<string, string>) {
  const original: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(vars)) {
    original[key] = process.env[key];
    process.env[key] = value;
  }
  return () => {
    for (const key of Object.keys(vars)) {
      if (original[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original[key];
      }
    }
  };
}

/**
 * Wait for a promise with timeout
 */
export async function waitWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError: Error = new Error('Timeout'),
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(timeoutError), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutHandle);
  });
}

/**
 * Delay execution for specified milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
