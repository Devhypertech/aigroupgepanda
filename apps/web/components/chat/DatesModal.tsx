'use client';

import { useState, useEffect, useRef } from 'react';

interface DatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (startDate: string, endDate: string) => void;
}

export function DatesModal({ isOpen, onClose, onSubmit }: DatesModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(tomorrow);
  const [endDate, setEndDate] = useState(nextWeek);
  const modalRef = useRef<HTMLDivElement>(null);

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

  // Ensure end date is after start date
  useEffect(() => {
    if (endDate <= startDate) {
      const newEndDate = new Date(startDate);
      newEndDate.setDate(newEndDate.getDate() + 1);
      setEndDate(newEndDate.toISOString().split('T')[0]);
    }
  }, [startDate, endDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate && endDate && endDate > startDate) {
      console.log('[DATES_MODAL] Submitting dates:', { startDate, endDate });
      onSubmit(startDate, endDate);
      onClose();
    }
  };

  const handleQuickSelect = (days: number) => {
    const start = new Date();
    start.setDate(start.getDate() + 1); // Tomorrow
    const end = new Date(start);
    end.setDate(end.getDate() + days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

        <h2 className="text-xl font-semibold text-gp-text mb-4">Set Dates</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gp-text mb-2">
              Check-in
            </label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              min={today}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 bg-gp-bg border border-gp-border rounded-lg text-gp-text focus:outline-none focus:ring-2 focus:ring-gp-primary focus:border-transparent"
            />
            <p className="text-xs text-gp-muted mt-1">{formatDate(startDate)}</p>
          </div>

          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gp-text mb-2">
              Check-out
            </label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              min={startDate || today}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 bg-gp-bg border border-gp-border rounded-lg text-gp-text focus:outline-none focus:ring-2 focus:ring-gp-primary focus:border-transparent"
            />
            <p className="text-xs text-gp-muted mt-1">{formatDate(endDate)}</p>
          </div>

          <div>
            <p className="text-sm text-gp-muted mb-2">Quick select:</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleQuickSelect(2)}
                className="px-3 py-1.5 bg-gp-bg border border-gp-border rounded-lg text-sm text-gp-text hover:bg-gp-primary hover:text-black transition-colors"
              >
                2 nights
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(3)}
                className="px-3 py-1.5 bg-gp-bg border border-gp-border rounded-lg text-sm text-gp-text hover:bg-gp-primary hover:text-black transition-colors"
              >
                3 nights
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(7)}
                className="px-3 py-1.5 bg-gp-bg border border-gp-border rounded-lg text-sm text-gp-text hover:bg-gp-primary hover:text-black transition-colors"
              >
                1 week
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(14)}
                className="px-3 py-1.5 bg-gp-bg border border-gp-border rounded-lg text-sm text-gp-text hover:bg-gp-primary hover:text-black transition-colors"
              >
                2 weeks
              </button>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-sm text-gp-muted">
              Duration: {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))} nights
            </p>
          </div>

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
              disabled={!startDate || !endDate || endDate <= startDate}
              className="flex-1 px-4 py-2 bg-gp-primary hover:bg-gp-primary-dark text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Set Dates
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

