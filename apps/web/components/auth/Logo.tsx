/**
 * GePanda Logo Component
 */

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
}

export function Logo({ size = 'medium' }: LogoProps) {
  const sizeMap = {
    small: '40px',
    medium: '64px',
    large: '80px',
  };

  const fontSizeMap = {
    small: '18px',
    medium: '28px',
    large: '36px',
  };

  return (
    <div
      style={{
        width: sizeMap[size],
        height: sizeMap[size],
        borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--gp-primary) 0%, var(--gp-primary-dark) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(18, 195, 165, 0.3)',
        border: '2px solid rgba(18, 195, 165, 0.2)',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          color: '#ffffff',
          fontSize: fontSizeMap[size],
          fontWeight: '700',
          letterSpacing: '-0.02em',
        }}
      >
        GP
      </span>
    </div>
  );
}

