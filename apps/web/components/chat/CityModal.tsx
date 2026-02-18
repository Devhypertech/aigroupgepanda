'use client';

import { useState, useEffect, useRef } from 'react';

interface CityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (city: string) => void;
}

const POPULAR_CITIES = [
  'Tokyo', 'Paris', 'New York', 'London', 'Barcelona', 'Rome', 'Bali', 'Dubai',
  'Singapore', 'Sydney', 'Amsterdam', 'Berlin', 'Bangkok', 'Istanbul', 'Seoul',
  'Hong Kong', 'Vienna', 'Prague', 'Lisbon', 'Athens', 'Cairo', 'Marrakech',
  'Reykjavik', 'Oslo', 'Stockholm', 'Copenhagen', 'Helsinki', 'Dublin', 'Edinburgh',
  'Florence', 'Venice', 'Santorini', 'Mykonos', 'Maldives', 'Phuket', 'Kyoto',
  'Seoul', 'Taipei', 'Shanghai', 'Mumbai', 'Delhi', 'Kathmandu', 'Hanoi', 'Ho Chi Minh City'
];

export function CityModal({ isOpen, onClose, onSubmit }: CityModalProps) {
  const [city, setCity] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input
  useEffect(() => {
    if (city.trim().length > 0) {
      const filtered = POPULAR_CITIES.filter(c =>
        c.toLowerCase().includes(city.toLowerCase())
      ).slice(0, 8);
      setSuggestions(filtered);
    } else {
      setSuggestions(POPULAR_CITIES.slice(0, 8));
    }
  }, [city]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (city.trim()) {
      console.log('[CITY_MODAL] Submitting city:', city);
      onSubmit(city.trim());
      setCity('');
      onClose();
    }
  };

  const handleSuggestionClick = (suggestedCity: string) => {
    console.log('[CITY_MODAL] Selected suggestion:', suggestedCity);
    setCity(suggestedCity);
    onSubmit(suggestedCity);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div
        ref={modalRef}
        className="bg-gp-surface border border-gp-border rounded-xl shadow-xl w-full max-w-md p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gp-muted hover:text-gp-text transition-colors text-2xl font-bold leading-none"
          aria-label="Close modal"
        >
          ×
        </button>

        <h2 className="text-xl font-semibold text-gp-text mb-4">Set City</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="city-input" className="block text-sm font-medium text-gp-text mb-2">
              Enter city name
            </label>
            <input
              ref={inputRef}
              id="city-input"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g., Tokyo, Paris, New York"
              className="w-full px-4 py-2 bg-gp-bg border border-gp-border rounded-lg text-gp-text placeholder-gp-muted focus:outline-none focus:ring-2 focus:ring-gp-primary focus:border-transparent"
            />
          </div>

          {suggestions.length > 0 && (
            <div>
              <p className="text-sm text-gp-muted mb-2">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-3 py-1.5 bg-gp-bg border border-gp-border rounded-lg text-sm text-gp-text hover:bg-gp-primary hover:text-black transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gp-bg border border-gp-border rounded-lg text-gp-text hover:bg-gp-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!city.trim()}
              className="flex-1 px-4 py-2 bg-gp-primary hover:bg-gp-primary-dark text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Set City
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

