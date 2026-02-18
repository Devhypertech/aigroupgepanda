/**
 * Divider Component - "or" separator
 */

interface DividerProps {
  isMobile?: boolean;
}

export function Divider({ isMobile = false }: DividerProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        margin: isMobile ? '1.5rem 0' : '2rem 0',
      }}
    >
      <div
        style={{
          flex: 1,
          height: '1px',
          background: 'rgba(255, 255, 255, 0.1)',
        }}
      />
      <span
        style={{
          color: 'var(--gp-muted)',
          fontSize: isMobile ? '0.875rem' : '0.9375rem',
          fontWeight: '400',
        }}
      >
        or
      </span>
      <div
        style={{
          flex: 1,
          height: '1px',
          background: 'rgba(255, 255, 255, 0.1)',
        }}
      />
    </div>
  );
}

