import type { FrameSample } from './types';
import { todo } from './todo';

/** Reduce to ≤ max samples preserving extremes (faces changes, off-screen gaze) — LTTB-like or bucket min/max. */
export function downsampleSamples(samples: FrameSample[], max: number): FrameSample[] {
  return todo('downsampleSamples');
}
