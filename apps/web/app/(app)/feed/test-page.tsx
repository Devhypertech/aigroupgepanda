/**
 * Simple test page to verify rendering works
 * Visit /feed/test to see if basic rendering works
 */

export default function TestPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#070A0D',
      color: '#EAF7F4',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Test Page</h1>
      <p style={{ fontSize: '1rem', color: 'rgba(234, 247, 244, 0.65)' }}>
        If you can see this, basic rendering works!
      </p>
      <a 
        href="/feed" 
        style={{
          marginTop: '2rem',
          padding: '0.75rem 1.5rem',
          background: '#12C3A5',
          color: '#000',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: '600',
        }}
      >
        Go to Feed
      </a>
    </div>
  );
}

