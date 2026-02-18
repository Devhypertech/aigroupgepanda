'use client';

import { useEffect } from 'react';

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Chat]', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--gp-bg)',
        color: 'var(--gp-text)',
      }}
    >
      <h2 style={{ marginBottom: 16 }}>Chat failed to load</h2>
      <p style={{ marginBottom: 24, color: 'var(--gp-muted)', maxWidth: 400, textAlign: 'center' }}>
        {error.message}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        style={{
          padding: '10px 20px',
          cursor: 'pointer',
          background: 'var(--gp-primary)',
          color: '#000',
          border: 'none',
          borderRadius: 8,
          fontWeight: 600,
        }}
      >
        Try again
      </button>
    </div>
  );
}
