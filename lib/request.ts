/** Shared timeout/error handling; upstream failures must never masquerade as empty stats. */
export async function fetchChecked(input: string, init?: RequestInit & { next?: { revalidate: number } }) {
  const response = await globalThis.fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Data provider returned ${response.status}. Please try again.`);
  return response;
}
