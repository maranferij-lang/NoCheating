import { Check } from 'lucide-react';
import { cn } from './cn';

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex w-full items-center gap-2 overflow-x-auto text-xs sm:text-sm" aria-label="Кроки">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex min-w-0 items-center gap-2">
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                done && 'bg-emerald-600 text-white',
                active && 'bg-brand-700 text-white ring-4 ring-brand-100',
                !done && !active && 'bg-slate-200 text-slate-600',
              )}
              aria-current={active ? 'step' : undefined}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={cn('whitespace-nowrap', active ? 'font-semibold text-slate-900' : 'text-slate-500')}>{s}</span>
            {i < steps.length - 1 && <span className="mx-1 h-px w-6 shrink-0 bg-slate-300" />}
          </li>
        );
      })}
    </ol>
  );
}
