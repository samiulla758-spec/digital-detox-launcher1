import { createContext, useContext, type ReactNode } from 'react';
import { useDetoxStore, type DetoxStore } from '@/lib/store';

const Ctx = createContext<DetoxStore | null>(null);

export function DetoxProvider({ children }: { children: ReactNode }) {
  const store = useDetoxStore();
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useDetox(): DetoxStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDetox must be used within DetoxProvider');
  return ctx;
}
