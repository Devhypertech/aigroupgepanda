/**
 * Feed Card Component
 * Renders different card types: deal, article, video, destination, product
 */

'use client';

import type { FeedItem } from '@gepanda/shared';

interface FeedCardProps {
  item: FeedItem;
  isMobile: boolean;
  onDealClick?: (affiliateUrl: string) => void;
}

export function FeedCard({ item, isMobile, onDealClick }: FeedCardProps) {
  const handleDealClick = () => {
    if (item.affiliateUrl && onDealClick) {
      onDealClick(item.affiliateUrl);
    } else if (item.affiliateUrl) {
      window.open(item.affiliateUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Deal Card
  if (item.type === 'deal') {
    return (
      <div style={{
        background: 'var(--gp-surface)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(18, 195, 165, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      >
        {item.mediaUrl && (
          <div style={{
            width: '100%',
            height: isMobile ? '200px' : '240px',
            background: `url(${item.mediaUrl}) center/cover`,
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute',
              top: '1rem',
              left: '1rem',
              background: 'rgba(18, 195, 165, 0.9)',
              backdropFilter: 'blur(10px)',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontWeight: '600',
              color: '#000',
            }}>
              💰 Deal
            </div>
          </div>
        )}
        <div style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
          <h2 style={{
            margin: '0 0 0.5rem 0',
            fontSize: isMobile ? '1.125rem' : '1.25rem',
            fontWeight: '600',
            color: 'var(--gp-text)',
          }}>
            {item.title}
          </h2>
          <p style={{
            margin: '0 0 1rem 0',
            fontSize: isMobile ? '0.875rem' : '1rem',
            color: 'var(--gp-muted)',
            lineHeight: '1.6',
          }}>
            {item.description}
          </p>
          {item.source && (
            <p style={{
              margin: '0 0 1rem 0',
              fontSize: isMobile ? '0.75rem' : '0.8125rem',
              color: 'var(--gp-muted)',
            }}>
              Source: {item.source}
            </p>
          )}
          {item.affiliateUrl && (
            <button
              onClick={handleDealClick}
              style={{
                width: '100%',
                padding: isMobile ? '0.75rem 1rem' : '0.875rem 1.25rem',
                borderRadius: '8px',
                background: 'var(--gp-primary)',
                color: '#000',
                border: 'none',
                fontWeight: '600',
                fontSize: isMobile ? '0.875rem' : '1rem',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              View Deal
            </button>
          )}
        </div>
      </div>
    );
  }

  // Article Card
  if (item.type === 'article') {
    return (
      <div style={{
        background: 'var(--gp-surface)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(18, 195, 165, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      >
        {item.mediaUrl && (
          <div style={{
            width: '100%',
            height: isMobile ? '200px' : '240px',
            background: `url(${item.mediaUrl}) center/cover`,
          }} />
        )}
        <div style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.75rem',
          }}>
            <span style={{
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              background: 'rgba(18, 195, 165, 0.1)',
              fontSize: isMobile ? '0.75rem' : '0.8125rem',
              color: 'var(--gp-primary)',
              fontWeight: '500',
            }}>
              📰 Article
            </span>
            {item.category && (
              <span style={{
                fontSize: isMobile ? '0.75rem' : '0.8125rem',
                color: 'var(--gp-muted)',
                textTransform: 'capitalize',
              }}>
                {item.category}
              </span>
            )}
          </div>
          <h2 style={{
            margin: '0 0 0.5rem 0',
            fontSize: isMobile ? '1.125rem' : '1.25rem',
            fontWeight: '600',
            color: 'var(--gp-text)',
          }}>
            {item.title}
          </h2>
          <p style={{
            margin: '0 0 1rem 0',
            fontSize: isMobile ? '0.875rem' : '1rem',
            color: 'var(--gp-muted)',
            lineHeight: '1.6',
          }}>
            {item.description}
          </p>
          {item.source && (
            <p style={{
              margin: 0,
              fontSize: isMobile ? '0.75rem' : '0.8125rem',
              color: 'var(--gp-muted)',
            }}>
              {item.source}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Video Card
  if (item.type === 'video') {
    // Extract YouTube video ID from URL
    const getYouTubeId = (url: string | null): string | null => {
      if (!url) return null;
      const match = url.match(/(?:youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([^&\n?#]+)/);
      return match ? match[1] : null;
    };

    const videoId = getYouTubeId(item.mediaUrl);

    return (
      <div style={{
        background: 'var(--gp-surface)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(18, 195, 165, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      >
        {videoId ? (
          <div style={{
            position: 'relative',
            width: '100%',
            paddingBottom: '56.25%', // 16:9 aspect ratio
            background: '#000',
          }}>
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : item.mediaUrl ? (
          <div style={{
            width: '100%',
            height: isMobile ? '200px' : '240px',
            background: `url(${item.mediaUrl}) center/cover`,
          }} />
        ) : null}
        <div style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.75rem',
          }}>
            <span style={{
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              background: 'rgba(18, 195, 165, 0.1)',
              fontSize: isMobile ? '0.75rem' : '0.8125rem',
              color: 'var(--gp-primary)',
              fontWeight: '500',
            }}>
              🎥 Video
            </span>
            {item.category && (
              <span style={{
                fontSize: isMobile ? '0.75rem' : '0.8125rem',
                color: 'var(--gp-muted)',
                textTransform: 'capitalize',
              }}>
                {item.category}
              </span>
            )}
          </div>
          <h2 style={{
            margin: '0 0 0.5rem 0',
            fontSize: isMobile ? '1.125rem' : '1.25rem',
            fontWeight: '600',
            color: 'var(--gp-text)',
          }}>
            {item.title}
          </h2>
          <p style={{
            margin: '0 0 1rem 0',
            fontSize: isMobile ? '0.875rem' : '1rem',
            color: 'var(--gp-muted)',
            lineHeight: '1.6',
          }}>
            {item.description}
          </p>
          {item.source && (
            <p style={{
              margin: 0,
              fontSize: isMobile ? '0.75rem' : '0.8125rem',
              color: 'var(--gp-muted)',
            }}>
              {item.source}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Default card (destination, product, etc.)
  return (
    <div style={{
      background: 'var(--gp-surface)',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      overflow: 'hidden',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 8px 24px rgba(18, 195, 165, 0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}
    >
      {item.mediaUrl && (
        <div style={{
          width: '100%',
          height: isMobile ? '200px' : '240px',
          background: `url(${item.mediaUrl}) center/cover`,
        }} />
      )}
      <div style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
        <h2 style={{
          margin: '0 0 0.5rem 0',
          fontSize: isMobile ? '1.125rem' : '1.25rem',
          fontWeight: '600',
          color: 'var(--gp-text)',
        }}>
          {item.title}
        </h2>
        <p style={{
          margin: '0 0 1rem 0',
          fontSize: isMobile ? '0.875rem' : '1rem',
          color: 'var(--gp-muted)',
          lineHeight: '1.6',
        }}>
          {item.description}
        </p>
        {item.source && (
          <p style={{
            margin: 0,
            fontSize: isMobile ? '0.75rem' : '0.8125rem',
            color: 'var(--gp-muted)',
          }}>
            {item.source}
          </p>
        )}
      </div>
    </div>
  );
}

