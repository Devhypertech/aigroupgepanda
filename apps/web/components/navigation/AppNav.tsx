/**
 * App Navigation Component
 * Top nav on desktop, bottom nav on mobile
 */

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

interface AppNavProps {
  isMobile: boolean;
}

export function AppNav({ isMobile }: AppNavProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Don't show nav if not authenticated
  if (!session) {
    return null;
  }

  const navItems = [
    { href: '/feed', label: 'Home', icon: '🏠' },
    { href: '/chat', label: 'Ask AI', icon: '💬' },
  ];

  if (isMobile) {
    // Bottom navigation for mobile
    return (
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--gp-surface)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '0.75rem 0',
        zIndex: 100,
        backdropFilter: 'blur(10px)',
      }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === '/chat' && pathname === '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem',
                textDecoration: 'none',
                color: isActive ? 'var(--gp-primary)' : 'var(--gp-muted)',
                padding: '0.5rem 1.5rem',
                borderRadius: '8px',
                transition: 'all 0.2s',
                fontSize: '0.75rem',
                fontWeight: isActive ? '600' : '400',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--gp-text)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--gp-muted)';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  // Top navigation for desktop
  return (
    <nav style={{
      background: 'var(--gp-surface)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      padding: '0 2rem',
      display: 'flex',
      alignItems: 'center',
      gap: '2rem',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(10px)',
    }}>
      <Link
        href="/feed"
        style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          color: 'var(--gp-text)',
          textDecoration: 'none',
          marginRight: 'auto',
        }}
      >
        GePanda
      </Link>
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href === '/chat' && pathname === '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              textDecoration: 'none',
              color: isActive ? 'var(--gp-text)' : 'var(--gp-muted)',
              background: isActive ? 'rgba(18, 195, 165, 0.1)' : 'transparent',
              border: isActive ? '1px solid var(--gp-primary)' : '1px solid transparent',
              fontWeight: isActive ? '600' : '400',
              fontSize: '0.9375rem',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'var(--gp-text)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'var(--gp-muted)';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

