'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="panel"><h1>Data is temporarily unavailable</h1><p>Please check your connection and try again.</p><button className="action" onClick={reset}>Try again</button></section>;
}
