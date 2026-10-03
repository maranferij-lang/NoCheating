import type { ReactNode } from 'react';
import type { RiskLevel, Severity } from '@nocheating/core';
import { cn } from './cn';

export type Tone = 'neutral' | 'brand' | 'info' | 'success' | 'warning' | 'orange' | 'danger';

const tones: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  brand: 'bg-brand-50 text-brand-800 ring-brand-200',
  info: 'bg-sky-50 text-sky-800 ring-sky-200',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  orange: 'bg-orange-50 text-orange-800 ring-orange-200',
  danger: 'bg-red-50 text-red-800 ring-red-200',
};

export function Badge({ tone = 'neutral', children, className, icon }: { tone?: Tone; children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', tones[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

export const riskTone: Record<RiskLevel, Tone> = { low: 'success', medium: 'warning', high: 'orange', critical: 'danger' };
export const severityTone: Record<Severity, Tone> = { info: 'neutral', low: 'info', medium: 'warning', high: 'orange', critical: 'danger' };
export const riskColor: Record<RiskLevel, string> = {
  low: 'var(--color-risk-low)',
  medium: 'var(--color-risk-medium)',
  high: 'var(--color-risk-high)',
  critical: 'var(--color-risk-critical)',
};
export const severityColor: Record<Severity, string> = {
  info: '#94a3b8',
  low: '#0284c7',
  medium: 'var(--color-risk-medium)',
  high: 'var(--color-risk-high)',
  critical: 'var(--color-risk-critical)',
};
