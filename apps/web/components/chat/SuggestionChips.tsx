/**
 * Suggestion Chips Component - Quick action suggestions
 */

interface SuggestionChip {
  text: string;
  onClick: () => void;
}

interface SuggestionChipsProps {
  suggestions: SuggestionChip[];
  visible?: boolean;
  isMobile?: boolean;
}

export function SuggestionChips({ suggestions, visible = true, isMobile = false }: SuggestionChipsProps) {
  if (!visible || suggestions.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: isMobile ? '0.375rem' : '0.5rem',
        padding: isMobile ? '0.75rem 0' : '1rem 0',
        justifyContent: 'center',
      }}
    >
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={suggestion.onClick}
          style={{
            padding: isMobile ? '0.5rem 1rem' : '0.625rem 1.25rem',
            borderRadius: '1.5rem',
            border: '1px solid rgba(45, 157, 122, 0.3)',
            background: 'rgba(26, 122, 94, 0.1)',
            color: '#2d9d7a',
            fontSize: isMobile ? '0.8125rem' : '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontWeight: '500',
            touchAction: 'manipulation', // Better touch handling on mobile
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(26, 122, 94, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(45, 157, 122, 0.5)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(26, 122, 94, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(45, 157, 122, 0.3)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {suggestion.text}
        </button>
      ))}
    </div>
  );
}

