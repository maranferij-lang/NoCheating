import type { ExamPolicy, PolicyPreset } from './types';
import { todo } from './todo';

/** Standard preset (the default for new exams). Room scan OFF, audio VAD OFF, screen recording OFF. */
export const DEFAULT_POLICY: ExamPolicy = undefined as unknown as ExamPolicy; // builder: replace with literal

/** Returns a fresh copy of the preset policy. 'soft' = fewer, later flags; 'strict' = more sensitive. */
export function policyPreset(preset: PolicyPreset): ExamPolicy {
  return todo('policyPreset');
}

/** Deep-merge a partial policy over a preset (used when proctor edits an exam). */
export function mergePolicy(base: ExamPolicy, patch: Partial<ExamPolicy>): ExamPolicy {
  return todo('mergePolicy');
}

/** Ukrainian labels for presets and every boolean/numeric policy field (for the exam editor UI). */
export const POLICY_LABELS: Record<string, { label: string; hint: string }> = {};
