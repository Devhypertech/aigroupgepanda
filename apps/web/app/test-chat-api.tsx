'use client';

import { useState } from 'react';

export default function TestChatAPI() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testEndpoints = async () => {
    setLoading(true);
    const testUserId = 'test_' + Date.now();
    const testUsername = 'Test User';
    
    const steps: any[] = [];
    
    try {
      // Test 1: Health check
      steps.push({ step: 'Health check', start: Date.now() });
      const healthRes = await fetch('/api/healthz');
      const healthData = await healthRes.json();
      steps[steps.length - 1].end = Date.now();
      steps[steps.length - 1].duration = steps[steps.length - 1].end - steps[steps.length - 1].start;
      steps[steps.length - 1].status = healthRes.status;
      steps[steps.length - 1].data = healthData;
      
      // Test 2: Token
      steps.push({ step: 'Token fetch', start: Date.now() });
      const tokenRes = await fetch('/api/stream/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUserId, username: testUsername }),
        credentials: 'include',
      });
      const tokenData = await tokenRes.json();
      steps[steps.length - 1].end = Date.now();
      steps[steps.length - 1].duration = steps[steps.length - 1].end - steps[steps.length - 1].start;
      steps[steps.length - 1].status = tokenRes.status;
      steps[steps.length - 1].data = tokenData;
      
      // Test 3: Channel
      steps.push({ step: 'Channel fetch', start: Date.now() });
      const channelRes = await fetch('/api/companion/channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUserId }),
        credentials: 'include',
      });
      const channelData = await channelRes.json();
      steps[steps.length - 1].end = Date.now();
      steps[steps.length - 1].duration = steps[steps.length - 1].end - steps[steps.length - 1].start;
      steps[steps.length - 1].status = channelRes.status;
      steps[steps.length - 1].data = channelData;
      
      setResults({ success: true, steps });
    } catch (error: any) {
      setResults({ 
        success: false, 
        error: error.message,
        steps: steps.map(s => ({ ...s, end: Date.now(), duration: s.end ? s.duration : Date.now() - s.start }))
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Chat API Test</h1>
      <button 
        onClick={testEndpoints} 
        disabled={loading}
        style={{ padding: '10px 20px', fontSize: '16px', marginBottom: '20px' }}
      >
        {loading ? 'Testing...' : 'Test Endpoints'}
      </button>
      
      {results && (
        <div>
          <h2>Results:</h2>
          <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
            {JSON.stringify(results, null, 2)}
          </pre>
          
          {results.steps && (
            <div style={{ marginTop: '20px' }}>
              <h3>Step Timings:</h3>
              {results.steps.map((step: any, i: number) => (
                <div key={i} style={{ marginBottom: '10px', padding: '10px', background: step.status === 200 ? '#d4edda' : '#f8d7da' }}>
                  <strong>{step.step}</strong>: {step.duration}ms (Status: {step.status})
                  {step.data && (
                    <div style={{ marginTop: '5px', fontSize: '12px' }}>
                      {JSON.stringify(step.data)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
