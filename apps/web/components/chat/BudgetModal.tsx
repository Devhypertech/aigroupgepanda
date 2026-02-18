'use client';

import { useState, useEffect, useRef } from 'react';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number, currency: string) => void;
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
];

export function BudgetModal({ isOpen, onClose, onSubmit }: BudgetModalProps) {
  const [amount, setAmount] = useState(150);
  const [currency, setCurrency] = useState('USD');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount > 0) {
      console.log('[BUDGET_MODAL] Submitting budget:', { amount, currency });
      onSubmit(amount, currency);
      onClose();
    }
  };

  const handleQuickSelect = (value: number) => {
    setAmount(value);
  };

  const selectedCurrency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];

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

        <h2 className="text-xl font-semibold text-gp-text mb-4">Set Budget</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="currency-select" className="block text-sm font-medium text-gp-text mb-2">
              Currency
            </label>
            <select
              id="currency-select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-4 py-2 bg-gp-bg border border-gp-border rounded-lg text-gp-text focus:outline-none focus:ring-2 focus:ring-gp-primary focus:border-transparent"
            >
              {CURRENCIES.map((curr) => (
                <option key={curr.code} value={curr.code}>
                  {curr.symbol} {curr.code} - {curr.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="budget-slider" className="block text-sm font-medium text-gp-text mb-2">
              Budget per night: {selectedCurrency.symbol}{amount}
            </label>
            <input
              id="budget-slider"
              type="range"
              min="50"
              max="1000"
              step="10"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gp-primary"
            />
            <div className="flex justify-between text-xs text-gp-muted mt-1">
              <span>{selectedCurrency.symbol}50</span>
              <span>{selectedCurrency.symbol}1000</span>
            </div>
          </div>

          <div>
            <p className="text-sm text-gp-muted mb-2">Quick select:</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleQuickSelect(100)}
                className="px-3 py-1.5 bg-gp-bg border border-gp-border rounded-lg text-sm text-gp-text hover:bg-gp-primary hover:text-black transition-colors"
              >
                {selectedCurrency.symbol}100
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(150)}
                className="px-3 py-1.5 bg-gp-bg border border-gp-border rounded-lg text-sm text-gp-text hover:bg-gp-primary hover:text-black transition-colors"
              >
                {selectedCurrency.symbol}150
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(200)}
                className="px-3 py-1.5 bg-gp-bg border border-gp-border rounded-lg text-sm text-gp-text hover:bg-gp-primary hover:text-black transition-colors"
              >
                {selectedCurrency.symbol}200
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(300)}
                className="px-3 py-1.5 bg-gp-bg border border-gp-border rounded-lg text-sm text-gp-text hover:bg-gp-primary hover:text-black transition-colors"
              >
                {selectedCurrency.symbol}300
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(500)}
                className="px-3 py-1.5 bg-gp-bg border border-gp-border rounded-lg text-sm text-gp-text hover:bg-gp-primary hover:text-black transition-colors"
              >
                {selectedCurrency.symbol}500
              </button>
            </div>
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
              disabled={amount <= 0}
              className="flex-1 px-4 py-2 bg-gp-primary hover:bg-gp-primary-dark text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Set Budget
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

