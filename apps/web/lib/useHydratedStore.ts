/**
 * Hydration-safe hook for Zustand store in Next.js
 * Use this when you need to wait for client-side hydration before accessing store
 */

import { useState, useEffect } from 'react';
import { useAppStore, type AppStore } from './store';

/**
 * Hook that waits for hydration before returning store value
 * Returns undefined during SSR and initial render
 * 
 * @example
 * const messages = useHydratedStore((state) => state.messages);
 * if (!messages) return <Loading />; // Handle SSR/hydration
 */
export function useHydratedStore<T>(selector: (state: AppStore) => T): T | undefined {
  const store = useAppStore(selector);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated ? store : undefined;
}

