import { todo } from './todo';

/** Classic DBSCAN on 2-D points. Returns cluster label per point (0..k-1), -1 = noise. Deterministic. */
export function dbscan(points: [number, number][], eps: number, minPts: number): number[] {
  return todo('dbscan');
}
