import { todo } from './todo';

export interface HeadPose {
  yaw: number;
  pitch: number;
  roll: number;
}

/**
 * Euler angles (degrees) from MediaPipe FaceLandmarker `facialTransformationMatrixes[i].data`
 * (16 numbers, column-major 4x4). Convention: see types.ts header. Must be robust (no NaN).
 */
export function headPoseFromMatrix(m: ArrayLike<number>): HeadPose {
  return todo('headPoseFromMatrix');
}
