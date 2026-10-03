import type { FrameSample, Fixation, GazePolicy } from './types';
import { todo } from './todo';

/**
 * Off-screen gaze runs: consecutive samples whose gaze lies outside the screen (with a small
 * tolerance margin, e.g. 0.05), merged across ≤300 ms gaps and blinks (eyesClosed), lasting
 * ≥ policy.offscreenMinMs. Samples with faces !== 1 or no gaze break a run.
 * Each fixation reports mean gx/gy (clamped to a sensible range, e.g. [-1, 2]) and direction label.
 */
export function detectOffscreenFixations(samples: FrameSample[], policy: GazePolicy): Fixation[] {
  return todo('detectOffscreenFixations');
}
