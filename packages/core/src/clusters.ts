import type { Fixation, GazeCluster, GazePolicy } from './types';
import { todo } from './todo';

/**
 * Groups off-screen fixations by direction with DBSCAN (eps = policy.clusterEps, minPts =
 * policy.clusterMinPoints) inside sliding windows of policy.windowMs (step = windowMs/2), merges
 * overlapping clusters with near centroids, keeps clusters with dwell ≥ clusterMinDwellMs.
 * Ids must be deterministic (e.g. `gc-${firstT}`).
 */
export function clusterFixations(fixations: Fixation[], policy: GazePolicy): GazeCluster[] {
  return todo('clusterFixations');
}
