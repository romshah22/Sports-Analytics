export class ProviderError extends Error {
  constructor(public status: number) {
    super(`Data provider returned ${status}. Please try again.`);
    this.name = 'ProviderError';
  }
}

// Share timeout and HTTP-error handling across data providers.
export async function fetchChecked(input: string, init?: RequestInit & { next?: { revalidate: number } }) {
  const response = await globalThis.fetch(input, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new ProviderError(response.status);
  return response;
}
