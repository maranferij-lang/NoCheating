import type { EventType, ExamPolicy, ProctorEvent, RiskLevel, RiskSummary, Severity } from './types';
import { todo } from './todo';

export interface EventMeta {
  /** Short Ukrainian label, e.g. "Обличчя відсутнє". */
  label: string;
  /** One-sentence Ukrainian description for proctors. */
  description: string;
  defaultSeverity: Severity;
  /** Whether this event type contributes to the risk score at all. */
  scored: boolean;
  /** lucide-react icon name hint, e.g. 'EyeOff'. */
  icon: string;
}

export const EVENT_META: Record<EventType, EventMeta> = {} as Record<EventType, EventMeta>;

export const SEVERITY_LABELS: Record<Severity, string> = {} as Record<Severity, string>;
export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {} as Record<RiskLevel, string>;

export type RiskInputEvent = Pick<ProctorEvent, 'type' | 'severity' | 'durationMs' | 'data' | 't'> & {
  label?: ProctorEvent['label'];
};

/**
 * Explainable score 0..100. Per type: points = weight × (1 − e^(−count/k)) with per-type cap,
 * severity multipliers, events labelled 'false_positive' ignored, 'info' severity ignored.
 * Critical signals (face_mismatch, long multiple_faces) floor the score at 70.
 * contributions sorted by points desc, with Ukrainian explanations.
 */
export function computeRisk(
  events: RiskInputEvent[],
  policy: ExamPolicy,
  opts: { observedMs: number; unobservedMs: number; accommodations?: boolean; now?: string },
): RiskSummary {
  return todo('computeRisk');
}

export function riskLevel(score: number): RiskLevel {
  return todo('riskLevel');
}
