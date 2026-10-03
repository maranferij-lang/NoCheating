import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { cn } from './cn';

type ToastTone = 'info' | 'success' | 'warning' | 'danger';
interface ToastItem {
  id: number;
  text: ReactNode;
  tone: ToastTone;
}
const Ctx = createContext<(text: ReactNode, tone?: ToastTone) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((text: ReactNode, tone: ToastTone = 'info') => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs, { id, text, tone }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 4500);
  }, []);
  const tones: Record<ToastTone, string> = {
    info: 'bg-slate-900 text-white',
    success: 'bg-emerald-700 text-white',
    warning: 'bg-amber-500 text-slate-950',
    danger: 'bg-red-700 text-white',
  };
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="no-print pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={cn('pointer-events-auto rounded-xl px-4 py-3 text-sm shadow-lg', tones[t.tone])}>
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
