import { Link } from 'react-router-dom';

export function Logo({ to = '/', subtitle }: { to?: string; subtitle?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2.5">
      <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="#1e2e89" />
        <path d="M14 32c5-9 11-13 18-13s13 4 18 13c-5 9-11 13-18 13s-13-4-18-13z" fill="none" stroke="#fff" strokeWidth="4" />
        <circle cx="32" cy="32" r="6" fill="#facc15" />
      </svg>
      <span className="leading-tight">
        <span className="block text-base font-bold tracking-tight text-slate-900">NoCheating</span>
        {subtitle && <span className="block text-xs text-slate-500">{subtitle}</span>}
      </span>
    </Link>
  );
}
