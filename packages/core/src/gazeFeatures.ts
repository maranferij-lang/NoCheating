import { todo } from './todo';

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface GazeFeatureInput {
  /** 478 normalised landmarks from FaceLandmarker (incl. iris 468..477). */
  landmarks: Landmark[];
  /** Blendshape scores by categoryName (eyeLookInLeft, eyeLookOutRight, eyeBlinkLeft, jawOpen, ...). */
  blendshapes: Record<string, number>;
  /** 16-number facial transformation matrix (column-major). */
  matrix: ArrayLike<number>;
}

/** Ordered feature names produced by extractGazeFeatures (iris ratios, eyeLook* blendshapes, head pose, face position/scale). */
export const GAZE_FEATURE_NAMES: string[] = [];

/** Returns a feature vector (same order as GAZE_FEATURE_NAMES) or null when the face/eyes are unusable. */
export function extractGazeFeatures(input: GazeFeatureInput): number[] | null {
  return todo('extractGazeFeatures');
}

/** Both eyes closed according to blendshapes (eyeBlinkLeft/Right). */
export function eyesClosed(blendshapes: Record<string, number>): boolean {
  return todo('eyesClosed');
}
