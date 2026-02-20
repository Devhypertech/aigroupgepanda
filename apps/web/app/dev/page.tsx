'use client';

import { useState } from 'react';
import { getPublicConfig } from '../../lib/config';

type Result = { status: number; body: string; ok: boolean } | null;

export default function DevPage() {
  const config = getPublicConfig();
  const API_URL = config.apiUrl;

  const [userId, setUserId] = useState('dev_user');
  const [username, setUsername] = useState('Dev User');

  const [tokenResult, setTokenResult] = useState<Result>(null);
  const [tokenLoading, setTokenLoading] = useState(false);

  const [channelResult, setChannelResult] = useState<Result>(null);
  const [channelLoading, setChannelLoading] = useState(false);

  const [flightResult, setFlightResult] = useState<Result>(null);
  const [flightLoading, setFlightLoading] = useState(false);

  const callToken = async () => {
    setTokenLoading(true);
    setTokenResult(null);
    try {
      const res = await fetch(`${API_URL}/api/stream/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username }),
      });
      const text = await res.text();
      let body = text;
      try {
        body = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        // leave as raw text
      }
      setTokenResult({ status: res.status, body, ok: res.ok });
    } catch (err) {
      setTokenResult({
        status: 0,
        body: err instanceof Error ? err.message : String(err),
        ok: false,
      });
    } finally {
      setTokenLoading(false);
    }
  };

  const callChannel = async () => {
    setChannelLoading(true);
    setChannelResult(null);
    try {
      const res = await fetch(`${API_URL}/api/companion/channel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const text = await res.text();
      let body = text;
      try {
        body = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        // leave as raw text
      }
      setChannelResult({ status: res.status, body, ok: res.ok });
    } catch (err) {
      setChannelResult({
        status: 0,
        body: err instanceof Error ? err.message : String(err),
        ok: false,
      });
    } finally {
      setChannelLoading(false);
    }
  };

  const callFlightSearch = async () => {
    setFlightLoading(true);
    setFlightResult(null);
    try {
      const departDate = new Date();
      departDate.setDate(departDate.getDate() + 7);
      const body = {
        origin: 'JFK',
        destination: 'LAX',
        departDate: departDate.toISOString().split('T')[0],
        adults: 1,
        cabin: 'economy',
        directOnly: false,
      };
      const res = await fetch(`${API_URL}/api/flights/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let formatted = text;
      try {
        formatted = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        // leave as raw text
      }
      setFlightResult({ status: res.status, body: formatted, ok: res.ok });
    } catch (err) {
      setFlightResult({
        status: 0,
        body: err instanceof Error ? err.message : String(err),
        ok: false,
      });
    } finally {
      setFlightLoading(false);
    }
  };

  if (process.env.NODE_ENV === 'production') {
    return (
      <div style={{ padding: 24, color: 'var(--gp-text)' }}>
        <p>This page is only available in development.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: '0 auto', color: 'var(--gp-text)' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Dev – Backend POST tests</h1>
      <p style={{ color: 'var(--gp-muted)', marginBottom: 24 }}>
        Test POST-only endpoints. Opening these URLs in the browser (GET) will not work.
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '1.125rem', marginBottom: 12 }}>POST /api/stream/token</h2>
        <p style={{ color: 'var(--gp-muted)', fontSize: '0.875rem', marginBottom: 12 }}>
          Body: <code style={{ background: 'var(--gp-surface)', padding: '2px 6px', borderRadius: 4 }}>{'{{ userId, username }}'}</code>
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <input
            type="text"
            placeholder="userId"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--gp-border)', minWidth: 140 }}
          />
          <input
            type="text"
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--gp-border)', minWidth: 140 }}
          />
          <button
            type="button"
            onClick={callToken}
            disabled={tokenLoading}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: 'var(--gp-primary)',
              color: 'white',
              border: 'none',
              cursor: tokenLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {tokenLoading ? 'Calling…' : 'Call token'}
          </button>
        </div>
        {tokenResult && (
          <div style={{ marginTop: 12 }}>
            <div style={{ marginBottom: 6, fontSize: '0.875rem' }}>
              Status: <strong style={{ color: tokenResult.ok ? 'var(--gp-primary)' : 'var(--gp-error, #e53e3e)' }}>{tokenResult.status}</strong>
            </div>
            <pre
              style={{
                background: 'var(--gp-surface)',
                padding: 12,
                borderRadius: 8,
                overflow: 'auto',
                fontSize: '0.8125rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {tokenResult.body}
            </pre>
          </div>
        )}
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '1.125rem', marginBottom: 12 }}>POST /api/companion/channel</h2>
        <p style={{ color: 'var(--gp-muted)', fontSize: '0.875rem', marginBottom: 12 }}>
          Body: <code style={{ background: 'var(--gp-surface)', padding: '2px 6px', borderRadius: 4 }}>{'{{ userId }}'}</code>
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <input
            type="text"
            placeholder="userId"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--gp-border)', minWidth: 140 }}
          />
          <button
            type="button"
            onClick={callChannel}
            disabled={channelLoading}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: 'var(--gp-primary)',
              color: 'white',
              border: 'none',
              cursor: channelLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {channelLoading ? 'Calling…' : 'Call channel'}
          </button>
        </div>
        {channelResult && (
          <div style={{ marginTop: 12 }}>
            <div style={{ marginBottom: 6, fontSize: '0.875rem' }}>
              Status: <strong style={{ color: channelResult.ok ? 'var(--gp-primary)' : 'var(--gp-error, #e53e3e)' }}>{channelResult.status}</strong>
            </div>
            <pre
              style={{
                background: 'var(--gp-surface)',
                padding: 12,
                borderRadius: 8,
                overflow: 'auto',
                fontSize: '0.8125rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {channelResult.body}
            </pre>
          </div>
        )}
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '1.125rem', marginBottom: 12 }}>POST /api/flights/search</h2>
        <p style={{ color: 'var(--gp-muted)', fontSize: '0.875rem', marginBottom: 12 }}>
          Body: <code style={{ background: 'var(--gp-surface)', padding: '2px 6px', borderRadius: 4 }}>{'{{ origin, destination, departDate?, returnDate?, adults?, cabin?, directOnly? }}'}</code>
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <button
            type="button"
            onClick={callFlightSearch}
            disabled={flightLoading}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: 'var(--gp-primary)',
              color: 'white',
              border: 'none',
              cursor: flightLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {flightLoading ? 'Calling…' : 'Test flight search (JFK → LAX)'}
          </button>
        </div>
        {flightResult && (
          <div style={{ marginTop: 12 }}>
            <div style={{ marginBottom: 6, fontSize: '0.875rem' }}>
              Status: <strong style={{ color: flightResult.ok ? 'var(--gp-primary)' : 'var(--gp-error, #e53e3e)' }}>{flightResult.status}</strong>
            </div>
            <pre
              style={{
                background: 'var(--gp-surface)',
                padding: 12,
                borderRadius: 8,
                overflow: 'auto',
                fontSize: '0.8125rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {flightResult.body}
            </pre>
          </div>
        )}
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '1.125rem', marginBottom: 12 }}>Debug</h2>
        <p style={{ color: 'var(--gp-muted)', fontSize: '0.875rem', marginBottom: 12 }}>
          <a href={`${API_URL}/api/debug/routes`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gp-primary)', marginRight: 16 }}>GET /api/debug/routes</a>
          <a href={`${API_URL}/api/debug/env`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gp-primary)' }}>GET /api/debug/env</a>
        </p>
      </section>

      <p style={{ fontSize: '0.75rem', color: 'var(--gp-muted)' }}>
        API base: {API_URL}
      </p>
    </div>
  );
}
