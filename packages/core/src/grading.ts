import type { Question } from './types';
import { todo } from './todo';

/** Auto-grade single/multi questions (exact set match). Text questions count 0 and are excluded from maxScore. */
export function gradeAnswers(questions: Question[], answers: Record<string, number[] | string>): { score: number; maxScore: number } {
  return todo('gradeAnswers');
}
