import type { GazeModel } from './types';
import { todo } from './todo';

export interface CalibrationSample {
  features: number[];
  /** Target point in normalised screen coords. */
  x: number;
  y: number;
}

/** 9 calibration targets (3x3 grid with ~8% margins), normalised. Plus 4 validation targets. */
export const CALIBRATION_POINTS: { x: number; y: number }[] = [];
export const VALIDATION_POINTS: { x: number; y: number }[] = [];

/** Ridge regression (closed form, standardised features, bias not regularised). */
export function fitGazeModel(samples: CalibrationSample[], featureNames: string[], lambda?: number): GazeModel {
  return todo('fitGazeModel');
}

export function predictGaze(model: GazeModel, features: number[]): { x: number; y: number } {
  return todo('predictGaze');
}

/** Mean Euclidean error in normalised units. */
export function evaluateGazeModel(model: GazeModel, samples: CalibrationSample[]): number {
  return todo('evaluateGazeModel');
}

export function calibrationQuality(meanError: number): 'good' | 'fair' | 'poor' {
  return todo('calibrationQuality');
}

/** Exponential smoothing helper for live gaze (alpha 0..1). */
export class GazeSmoother {
  constructor(public alpha = 0.35) {}
  push(p: { x: number; y: number }): { x: number; y: number } {
    return todo('GazeSmoother.push');
  }
  reset(): void {}
}
