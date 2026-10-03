import type { LivenessChallengeType } from './types';
import { todo } from './todo';

export const LIVENESS_THRESHOLDS = {
  turnDeg: 18,
  lookUpDeg: 12,
  blinkClosed: 0.5,
  blinkOpen: 0.25,
  timeoutMs: 8000,
};

export const LIVENESS_PROMPTS: Record<LivenessChallengeType, string> = {} as Record<LivenessChallengeType, string>;

export interface LivenessFrame {
  yaw: number;
  pitch: number;
  blinkLeft: number;
  blinkRight: number;
  t: number;
}

/**
 * Pure state machine for one challenge. Feed frames; returns 'pending' | 'passed' | 'timeout'.
 * turn_left/right use the yaw convention from types.ts; blink requires closed→open transition.
 */
export class LivenessChecker {
  constructor(public type: LivenessChallengeType, public startT: number) {}
  push(frame: LivenessFrame): 'pending' | 'passed' | 'timeout' {
    return todo('LivenessChecker.push');
  }
}

/** Pick a random-looking but deterministic (by seed) sequence of 3 challenges. */
export function pickChallenges(seed: number): LivenessChallengeType[] {
  return todo('pickChallenges');
}
