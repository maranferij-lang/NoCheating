import { todo } from './todo';

/** 754000 → "12:34"; 3_754_000 → "1:02:34". Negative → "0:00". */
export function formatT(ms: number): string {
  return todo('formatT');
}

/** Ukrainian human duration: 4200 → "4 с"; 192000 → "3 хв 12 с"; 3_900_000 → "1 год 5 хв". */
export function formatDuration(ms: number): string {
  return todo('formatDuration');
}

/** Ukrainian plural helper: plural(5, ['раз', 'рази', 'разів']) → "разів". */
export function plural(n: number, forms: [string, string, string]): string {
  return todo('plural');
}
