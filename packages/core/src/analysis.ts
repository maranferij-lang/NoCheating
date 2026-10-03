import type { ExamPolicy, FrameSample, SessionAnalysis } from './types';
import { todo } from './todo';

export interface AnalysisOptions {
  /** Student declared accommodations → gaze/head events are produced with severity 'info'. */
  accommodations?: boolean;
}

/**
 * Pure, deterministic analysis of a session's FrameSamples (sorted by t; must tolerate unsorted
 * input and gaps). Produces server-derived events:
 * - face_missing: faces === 0 for ≥ policy.faceMissingSec (gaps in samples > 5 s are "unobserved",
 *   NOT face_missing). severity medium (≥ 30 s → high).
 * - multiple_faces: faces ≥ 2 for ≥ policy.multipleFacesSec. severity high.
 * - head_turned: |yaw| ≥ policy.headTurnDeg (or pitch ≤ -headTurnDeg when !allowPaper) for ≥ headTurnSec. medium.
 * - gaze_offscreen: single off-screen fixation ≥ policy.gaze.longOffscreenMs. low (downward + allowPaper → info).
 * - gaze_cluster: from clusterFixations. medium; ≥ 8 fixations or ≥ 60 s dwell → high.
 * Each event has t, durationMs, severity, source 'server_analysis', data (see types.ts).
 */
export function analyzeSamples(samples: FrameSample[], policy: ExamPolicy, opts?: AnalysisOptions): SessionAnalysis {
  return todo('analyzeSamples');
}

/** Time covered by samples (gaps > 5 s excluded) and total unobserved time, both ms. */
export function observedTime(samples: FrameSample[], totalMs: number): { observedMs: number; unobservedMs: number } {
  return todo('observedTime');
}
