import { todo } from './todo';

/**
 * Ukrainian direction label for an (off-screen) gaze point in normalised screen coords,
 * from the STUDENT's perspective: "ліворуч", "праворуч", "вгору", "вниз", "ліворуч-вниз",
 * "праворуч-вгору", ... ; "на екран" when inside [0,1]x[0,1].
 */
export function directionLabel(gx: number, gy: number): string {
  return todo('directionLabel');
}

/** Same idea for head pose (yaw/pitch, degrees). "прямо" when within ±10°. */
export function headDirectionLabel(yaw: number, pitch: number): string {
  return todo('headDirectionLabel');
}
