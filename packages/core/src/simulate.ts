import type { ClientEvent, FrameSample } from './types';
import { todo } from './todo';

export type ScenarioName =
  | 'honest'
  | 'thinker'
  | 'notes_left_down'
  | 'phone_on_desk'
  | 'helper_in_room'
  | 'tab_switcher'
  | 'air_raid_pause'
  | 'identity_swap';

export const SCENARIOS: Record<ScenarioName, { title: string; description: string; studentName: string }> =
  {} as Record<ScenarioName, { title: string; description: string; studentName: string }>;

/**
 * Deterministic (seeded PRNG) synthetic telemetry at 5 Hz for demos and tests.
 * - honest: eyes on screen, natural short glances, blinks.
 * - thinker: frequent short glances in RANDOM directions (should stay low risk).
 * - notes_left_down: repeated 2–6 s glances to the same left-down spot (gaze_cluster expected).
 * - phone_on_desk: periodic downward glances + object_detected 'cell phone' client events.
 * - helper_in_room: intervals with 2 faces + speech_detected events + head turns.
 * - tab_switcher: tab_hidden / window_blur / paste events.
 * - air_raid_pause: paused (air_raid) + resumed + gap in samples; otherwise honest.
 * - identity_swap: face_mismatch client event mid-exam + face_missing interval before it.
 */
export function simulateSession(
  scenario: ScenarioName,
  opts: { durationMin: number; seed: number },
): { samples: FrameSample[]; events: ClientEvent[] } {
  return todo('simulateSession');
}
