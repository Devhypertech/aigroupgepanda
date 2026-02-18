'use client';

import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'var(--gp-bg)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        overflow: 'hidden',
      }}
    >
      {/* Radial Teal Glow Blob Background */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(18, 195, 165, 0.15) 0%, rgba(18, 195, 165, 0.05) 40%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      
      {/* Secondary glow blob (smaller, offset) */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          right: '20%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(18, 195, 165, 0.1) 0%, transparent 60%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Content Container */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '440px',
          margin: '0 auto',
        }}
      >
        {/* Card Container */}
        <div
          style={{
            background: 'var(--gp-surface)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '2rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(18, 195, 165, 0.05)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* Header */}
          {(title || subtitle) && (
            <div
              style={{
                marginBottom: '2rem',
                textAlign: 'center',
              }}
            >
              {title && (
                <h1
                  style={{
                    fontSize: '1.875rem',
                    fontWeight: '700',
                    color: 'var(--gp-text)',
                    marginBottom: subtitle ? '0.5rem' : '0',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {title}
                </h1>
              )}
              {subtitle && (
                <p
                  style={{
                    fontSize: '0.9375rem',
                    color: 'var(--gp-muted)',
                    lineHeight: '1.5',
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {/* Children Content */}
          <div>{children}</div>
        </div>
      </div>

      {/* Mobile Responsive Styles */}
      <style jsx>{`
        @media (max-width: 640px) {
          div[style*="padding: '2rem'"] {
            padding: 1.5rem !important;
          }
          
          div[style*="maxWidth: '440px'"] {
            max-width: 100% !important;
            padding: 0.5rem !important;
          }
          
          h1 {
            font-size: 1.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}

