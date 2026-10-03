/**
 * Public surface of the proctoring engine. STUBS — the engine builder implements these in
 * sibling modules and re-exports them here with the SAME names/signatures.
 */
import type { DeviceInfo, GazeModel, MediaStreamKind } from '@nocheating/core';
import type { EngineOptions, FaceId, LoadProgress, ProctoringEngineApi, Vision } from './contract';

export * from './contract';

const todo = (n: string): never => {
  throw new Error('TODO ' + n);
};

/** Lazy singleton: loads MediaPipe wasm from /mediapipe/wasm and models from /models. */
export async function getVision(onProgress?: LoadProgress): Promise<Vision> {
  return todo('getVision');
}

/** Lazy singleton: loads face-api models from /models/faceapi. */
export async function getFaceId(onProgress?: LoadProgress): Promise<FaceId> {
  return todo('getFaceId');
}

/** getUserMedia with sane defaults (640x360@15, user-facing). Throws Ukrainian Error messages. */
export async function openCamera(opts?: { width?: number; height?: number; frameRate?: number; audio?: boolean; facingMode?: 'user' | 'environment' }): Promise<MediaStream> {
  return todo('openCamera');
}

/** Ask for an ENTIRE-SCREEN share; rejects (Ukrainian message) if a window/tab was chosen. */
export async function requestScreenShare(): Promise<MediaStream> {
  return todo('requestScreenShare');
}

export function stopStream(s: MediaStream | null | undefined): void {
  s?.getTracks().forEach((t) => t.stop());
}

/** JPEG from a video element (scaled to width). */
export async function captureJpeg(video: HTMLVideoElement, width = 480, quality = 0.8): Promise<Blob> {
  return todo('captureJpeg');
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return todo('blobToBase64');
}

/** Run face landmarker for durationMs and return achieved fps. */
export async function runBenchmark(video: HTMLVideoElement, durationMs?: number): Promise<number> {
  return todo('runBenchmark');
}

/** Screens via Window Management API (may prompt). Never throws. */
export async function checkScreens(): Promise<{ count: number | null; extended: boolean | null }> {
  return todo('checkScreens');
}

/** Upload speed (POSTs ~256 KB to /api/health?upload=1 — server accepts & discards) and latency. Never throws. */
export async function measureNetwork(): Promise<{ uploadKbps: number | null; latencyMs: number | null }> {
  return todo('measureNetwork');
}

/** Full DeviceInfo for the system-check step. */
export async function collectDeviceInfo(stream: MediaStream, benchmarkFps: number): Promise<DeviceInfo> {
  return todo('collectDeviceInfo');
}

/** Hex SHA-256 of a blob (crypto.subtle; falls back to a JS implementation on http:// non-localhost). */
export async function sha256Hex(blob: Blob): Promise<string> {
  return todo('sha256Hex');
}

/** Segment recorder: independent self-contained WebM/MP4 files every segmentMs. */
export interface SegmentInfo {
  stream: MediaStreamKind;
  seq: number;
  blob: Blob;
  tStart: number;
  tEnd: number;
}
export function createSegmentRecorder(opts: {
  stream: MediaStream;
  kind: MediaStreamKind;
  clock: () => number;
  segmentMs?: number;
  videoBitsPerSecond?: number;
  onSegment: (s: SegmentInfo) => void;
}): { start(): void; stop(): Promise<void>; readonly recording: boolean } {
  return todo('createSegmentRecorder');
}

export class ProctoringEngine implements ProctoringEngineApi {
  constructor(public opts: EngineOptions) {}
  start(): Promise<void> {
    return todo('start');
  }
  pause(): Promise<void> {
    return todo('pause');
  }
  resume(): Promise<void> {
    return todo('resume');
  }
  stop(): Promise<number> {
    return todo('stop');
  }
  emit(): void {
    todo('emit');
  }
  status(): never {
    return todo('status');
  }
}

export type { GazeModel };
