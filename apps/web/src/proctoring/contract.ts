/**
 * Proctoring engine CONTRACT (browser side). Owned/implemented by the engine builder in
 * apps/web/src/proctoring/*. Consumed by student pages (src/student), the lab page (src/lab)
 * and the phone page (src/phone). Keep names/signatures stable; adding optional fields is OK.
 */
import type {
  CalibrationSummary,
  ClientEvent,
  DeviceInfo,
  ExamPolicy,
  FrameSample,
  GazeModel,
  HeadPose,
  LivenessChallenge,
  MediaStreamKind,
  ProctorMessage,
  RiskSummary,
} from '@nocheating/core';
import type { Landmark } from '@nocheating/core';

export interface FaceBox {
  /** Normalised 0..1 in video coordinates. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface VisionFrame {
  /** performance.now() at detection. */
  ts: number;
  faces: number;
  faceBoxes: FaceBox[];
  /** First (largest) face only. */
  landmarks: Landmark[] | null;
  blendshapes: Record<string, number> | null;
  matrix: number[] | null;
  pose: HeadPose | null;
  features: number[] | null;
  eyesClosed: boolean;
  /** Present when a gaze model was supplied. Normalised screen coords (may be off-screen). */
  gaze: { x: number; y: number } | null;
  /** Rough image quality 0..1 (brightness/contrast/face size). */
  quality: number;
}

export interface ObjectDetection {
  /** COCO label ('cell phone', 'book', 'laptop', 'person', ...). */
  label: string;
  /** Ukrainian label for UI. */
  labelUk: string;
  score: number;
  box: FaceBox;
}

export interface Vision {
  /** MediaPipe FaceLandmarker (numFaces 3, blendshapes + matrices) in VIDEO mode. */
  detectFace(video: HTMLVideoElement, gazeModel?: GazeModel | null): VisionFrame;
  /** MediaPipe ObjectDetector (EfficientDet-Lite0, COCO) — call ≤ 1–2 Hz. Filtered to relevant labels. */
  detectObjects(video: HTMLVideoElement): ObjectDetection[];
  /** 'GPU' or 'CPU' delegate actually in use. */
  delegate: 'GPU' | 'CPU';
}

export interface FaceDescription {
  descriptor: number[];
  score: number;
  box: FaceBox;
}

export interface FaceId {
  /** Largest face's 128-d descriptor (face-api) or null if no face. */
  describe(input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement): Promise<FaceDescription | null>;
  distance(a: ArrayLike<number>, b: ArrayLike<number>): number;
  /** distance → 0..1 similarity for display. */
  score(distance: number): number;
  /** Thresholds: selfie↔live, selfie↔ID photo. */
  thresholds: { live: number; idCard: number };
}

export type LoadProgress = (stage: string, pct: number) => void;

export interface EngineStatus {
  running: boolean;
  paused: boolean;
  online: boolean;
  /** Pending uploads (segments + telemetry batches) persisted in IndexedDB. */
  queuedItems: number;
  queuedBytes: number;
  lastSyncAt: number | null;
  /** Actual analysis rate. */
  fps: number;
  faces: number;
  gazeOnScreen: boolean | null;
  recording: Partial<Record<MediaStreamKind, boolean>>;
  risk: RiskSummary | null;
  /** Last few local events for the student's transparency panel. */
  recentEvents: ClientEvent[];
  cameraOk: boolean;
}

export interface EngineOptions {
  stream: MediaStream;
  screenStream?: MediaStream | null;
  policy: ExamPolicy;
  gazeModel: GazeModel | null;
  enrolmentDescriptor: number[] | null;
  analysisHz: number;
  accommodations: boolean;
  /** Session clock: ms since session.startedAt (see types.ts). */
  clock: () => number;
  /** Upload/telemetry transport (student API by default; the lab page passes a no-op/local sink). */
  transport?: EngineTransport;
  /** Record video segments (default true). The lab page sets false. */
  record?: boolean;
  /** Upload periodic live snapshots (default true). */
  snapshots?: boolean;
  /** Persist the upload queue in IndexedDB under this key (default: session id from auth). */
  queueKey?: string;
  onEvent?: (e: ClientEvent) => void;
  onSample?: (s: FrameSample, frame: VisionFrame) => void;
  onStatus?: (s: EngineStatus) => void;
  onMessages?: (m: ProctorMessage[]) => void;
  onForceSubmit?: () => void;
}

export interface EngineTransport {
  sendTelemetry: typeof import('../lib/api').api.sendTelemetry;
  uploadSegment: typeof import('../lib/api').api.uploadSegment;
  uploadSnapshot: typeof import('../lib/api').api.uploadSnapshot;
}

export interface ProctoringEngineApi {
  start(): Promise<void>;
  /** LOCAL ONLY: stops analysis/recording (flushes the current segment). The student page calls
   * api.pause() itself; the server records the `paused` event. */
  pause(reason: 'air_raid' | 'blackout' | 'other', note?: string): Promise<void>;
  /** LOCAL ONLY: restarts analysis/recording. The student page calls api.resume(). */
  resume(): Promise<void>;
  /** Stop analysis and recording; wait up to timeoutMs for queued uploads. Returns remaining queued items. */
  stop(timeoutMs?: number): Promise<number>;
  /** UI-originated events (e.g. question_answered). id/t filled automatically. */
  emit(e: Omit<ClientEvent, 'id' | 't'> & { t?: number }): void;
  status(): EngineStatus;
}

export interface LivenessResult {
  passed: boolean;
  challenges: LivenessChallenge[];
}

export interface CalibrationResult extends CalibrationSummary {}
