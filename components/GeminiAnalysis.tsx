'use client';

import { useState, useEffect } from 'react';

interface GeminiAnalysisProps {
  prompt: string;
  label?: string;
  loadingLabel?: string;
  deps?: unknown[];
}

export default function GeminiAnalysis({
  prompt,
  label = '✨ Gemini AI Analysis',
  loadingLabel = 'Gemini AI Analyzing...',
  deps = [],
}: GeminiAnalysisProps) {
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!prompt) return;

    let cancelled = false;

    async function generate() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });

        const data = await response.json();

        if (cancelled) return;

        if (!response.ok) {
          setError(data.error || 'Analysis unavailable.');
          setAnalysis('');
          return;
        }

        setAnalysis(data.text);
      } catch {
        if (!cancelled) {
          setError('Analysis unavailable. Check your Gemini API key.');
          setAnalysis('');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    generate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, ...deps]);

  return (
    <div
      style={{
        background: 'var(--navy3)',
        borderLeft: '3px solid var(--accent2)',
        borderRadius: '8px',
        padding: '16px',
        marginTop: '16px',
      }}
    >
      <div
        style={{
          color: 'var(--accent2)',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: loading ? 'orange' : 'var(--accent2)',
            animation: loading ? 'geminiPulse 1.5s infinite' : 'none',
          }}
        />
        {loading ? loadingLabel : label}
      </div>
      {error ? (
        <p style={{ color: 'var(--accent)', fontSize: '13px', margin: 0 }}>
          {error}
        </p>
      ) : (
        <div
          style={{
            color: 'var(--text)',
            fontSize: '13px',
            lineHeight: 1.7,
            margin: 0,
            whiteSpace: 'pre-wrap',
          }}
        >
          {loading && !analysis ? 'Generating analysis...' : analysis}
        </div>
      )}
      <style>{`
        @keyframes geminiPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
