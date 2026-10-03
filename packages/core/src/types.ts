/**
 * NoCheating — shared domain types (the CONTRACT between web, server and core).
 *
 * Conventions
 * - All times inside a session (`t`, `tStart`, `tEnd`) are integer milliseconds of wall-clock time
 *   elapsed since `Session.startedAt` (the moment the exam itself started). Pauses are not
 *   subtracted: a pause is a gap on the timeline.
 *   Onboarding (consent, identity, calibration) happens before t=0 and is not part of the timeline.
 * - Wall-clock timestamps (`createdAt`, `startedAt`, ...) are ISO-8601 strings.
 * - Normalised gaze coordinates: gx, gy in screen space where (0,0) is the top-left and (1,1)
 *   the bottom-right corner of the student's screen. Values outside [0,1] mean "off-screen".
 * - Head pose angles are degrees. yaw > 0 = student turns head to THEIR left (camera sees face turn
 *   to image-right); this is what MediaPipe's facial transformation matrix gives after
 *   `headPoseFromMatrix`. pitch > 0 = looking up. roll > 0 = tilting head clockwise (from camera).
 *   NOTE: implementers must keep one consistent convention and document it in `headpose.ts`.
 * - All user-facing strings are Ukrainian.
 */

export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type PolicyPreset = 'soft' | 'standard' | 'strict';

export interface GazePolicy {
  enabled: boolean;
  /** An off-screen gaze run shorter than this is ignored (saccades, blinks, thinking). */
  offscreenMinMs: number;
  /** A single off-screen run longer than this becomes its own `gaze_offscreen` event. */
  longOffscreenMs: number;
  /** DBSCAN radius in normalised screen units over fixation directions. */
  clusterEps: number;
  /** DBSCAN min points (fixations) to form a cluster. */
  clusterMinPoints: number;
  /** Total dwell inside one cluster required to raise `gaze_cluster`. */
  clusterMinDwellMs: number;
  /** Sliding window for clustering (ms). Clusters are searched per window and merged. */
  windowMs: number;
}

export interface ExamPolicy {
  preset: PolicyPreset;
  requireIdCard: boolean;
  requireLiveness: boolean;
  requireFullscreen: boolean;
  requireSingleMonitor: boolean;
  /** Paper drafts allowed: looking down is expected, so downward gaze/head pitch is dampened. */
  allowPaper: boolean;
  /** Voice-activity detection only. Audio is NEVER recorded in this prototype. */
  audioVad: boolean;
  /** Ask the student to share the entire screen and record it at low fps. */
  screenRecording: boolean;
  phoneCamera: 'off' | 'optional' | 'required';
  /** Room scan is legally risky (Ogletree v. Cleveland State, 2022) — off by default. */
  roomScan: boolean;
  /** Re-verify identity against the enrolment selfie every N seconds (0 = off). */
  reverifyIntervalSec: number;
  /** Maximum total pause (air-raid alert / blackout) in minutes. */
  maxPauseMin: number;
  /** Seconds without face before `face_missing` is raised. */
  faceMissingSec: number;
  /** Seconds with ≥2 faces before `multiple_faces` is raised. */
  multipleFacesSec: number;
  /** |yaw| above this (degrees) for `headTurnSec` raises `head_turned`. */
  headTurnDeg: number;
  headTurnSec: number;
  gaze: GazePolicy;
  /** Data retention for sessions without violations (days). */
  retentionDays: number;
}

export type QuestionType = 'single' | 'multi' | 'text';

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  /** For single/multi. */
  options?: string[];
  /** Indices of correct options (single/multi). Never sent to students. */
  correct?: number[];
  points: number;
}

/** Question as the student sees it (no `correct`). */
export type PublicQuestion = Omit<Question, 'correct'>;

export type ExamStatus = 'draft' | 'open' | 'closed';

export interface Exam {
  id: string;
  /** 6-character join code, uppercase letters+digits without ambiguous chars. */
  code: string;
  title: string;
  description: string;
  durationMin: number;
  status: ExamStatus;
  policy: ExamPolicy;
  questions: Question[];
  createdAt: string;
}

/** What a student receives before joining. */
export interface PublicExam {
  id: string;
  code: string;
  title: string;
  description: string;
  durationMin: number;
  status: ExamStatus;
  policy: ExamPolicy;
  questionCount: number;
}

export interface ExamSummary extends PublicExam {
  createdAt: string;
  sessionCounts: { total: number; inProgress: number; submitted: number; flagged: number };
}

export type SessionStatus = 'created' | 'onboarding' | 'in_progress' | 'paused' | 'submitted' | 'abandoned';

export interface ConsentRecord {
  /** Video recording + automated analysis. Required. */
  recording: boolean;
  /** Biometric processing (face template). Required. */
  biometrics: boolean;
  /** Screen recording (only if policy.screenRecording). */
  screen: boolean;
  /** Phone camera (only if policy.phoneCamera !== 'off'). */
  phone: boolean;
  /** Student declared special needs → gaze/head signals are not scored, only recorded. */
  accommodations: boolean;
  accommodationsNote?: string;
  acceptedAt: string;
  /** Version of the consent text shown. */
  textVersion: string;
}

export interface DeviceInfo {
  userAgent: string;
  browser: string;
  os: string;
  isMobile: boolean;
  screens: {
    /** Number of screens if the Window Management API is granted, otherwise null. */
    count: number | null;
    /** `screen.isExtended` when supported, otherwise null. */
    extended: boolean | null;
    width: number;
    height: number;
    dpr: number;
  };
  camera: {
    label: string;
    width: number;
    height: number;
    frameRate: number;
    /** Label matches a known virtual camera (OBS, ManyCam, Snap Camera, ...). */
    suspiciousVirtual: boolean;
  };
  microphone: { available: boolean; label: string };
  /** Face-landmarker frames/sec measured during the system check. */
  cpuBenchmarkFps: number;
  /** Chosen analysis rate (Hz) after the benchmark. */
  analysisHz: number;
  gpuRenderer: string | null;
  vmSuspected: boolean;
  network: { uploadKbps: number | null; latencyMs: number | null };
  checkedAt: string;
}

export type LivenessChallengeType = 'turn_left' | 'turn_right' | 'blink' | 'look_up';

export interface LivenessChallenge {
  type: LivenessChallengeType;
  passed: boolean;
  ms: number;
}

export interface IdentityResult {
  method: 'id_card_photo' | 'diia_planned' | 'manual';
  selfieCaptured: boolean;
  idCardCaptured: boolean;
  livenessPassed: boolean;
  livenessChallenges: LivenessChallenge[];
  /** Face found on the ID-card photo. */
  idFaceFound: boolean;
  /** Euclidean distance between 128-d face descriptors (face-api). Lower = more similar. */
  matchDistance: number | null;
  /** 0..1, derived from distance for display. */
  matchScore: number | null;
  /** null = could not be computed → manual review required. */
  matched: boolean | null;
  /** Enrolment descriptor (128 floats). Stored server-side only; deleted with the session. */
  descriptor?: number[];
  manualReviewRequired: boolean;
  verifiedAt: string;
}

/** Ridge-regression gaze model: screen = W · standardise(features) + b. */
export interface GazeModel {
  featureNames: string[];
  mean: number[];
  std: number[];
  /** Weights for gx (length = features + 1, last item is the bias). */
  wx: number[];
  /** Weights for gy (length = features + 1, last item is the bias). */
  wy: number[];
  lambda: number;
}

export interface CalibrationSummary {
  points: number;
  samples: number;
  /** Mean validation error in normalised screen units (0..~1.4). */
  meanError: number;
  /** Mean validation error in pixels for the calibration screen size. */
  meanErrorPx: number;
  quality: 'good' | 'fair' | 'poor';
  model: GazeModel;
  screenWidth: number;
  screenHeight: number;
  calibratedAt: string;
}

/**
 * One analysis frame, sent at ~5 Hz. Compact on purpose (90 min ≈ 27k samples).
 * All optional fields are absent when no face is detected.
 */
export interface FrameSample {
  t: number;
  /** Number of faces detected (0, 1, 2+). */
  faces: number;
  yaw?: number;
  pitch?: number;
  roll?: number;
  /** Calibrated gaze point (normalised screen coords, may be outside [0,1]). */
  gx?: number;
  gy?: number;
  /** Both eyes closed (blink or eyes shut). */
  eyesClosed?: boolean;
  /** jawOpen blendshape 0..1 (lip movement proxy). */
  mouth?: number;
  /** Face/landmark confidence or image quality 0..1. */
  quality?: number;
}

export type EventType =
  // derived on the server from FrameSamples (source = 'server_analysis')
  | 'face_missing'
  | 'multiple_faces'
  | 'head_turned'
  | 'gaze_offscreen'
  | 'gaze_cluster'
  // client ML (source = 'client_ml')
  | 'face_mismatch'
  | 'face_reverified'
  | 'object_detected'
  | 'speech_detected'
  | 'camera_lost'
  // browser (source = 'browser')
  | 'tab_hidden'
  | 'window_blur'
  | 'fullscreen_exit'
  | 'copy'
  | 'paste'
  | 'cut'
  | 'context_menu'
  | 'devtools_suspected'
  | 'monitor_change'
  | 'resize'
  | 'screen_share_stopped'
  | 'shortcut_blocked'
  // system / lifecycle (source = 'system')
  | 'network_offline'
  | 'network_online'
  | 'paused'
  | 'resumed'
  | 'exam_started'
  | 'exam_submitted'
  | 'question_answered'
  | 'proctor_message'
  // phone companion (source = 'phone')
  | 'phone_connected'
  | 'phone_disconnected'
  | 'phone_person_detected';

export type EventSource = 'client_ml' | 'browser' | 'server_analysis' | 'system' | 'phone';

export interface ProctorEvent {
  /** Client-generated id (nanoid) for idempotent uploads; server generates for derived events. */
  id: string;
  sessionId: string;
  type: EventType;
  t: number;
  durationMs?: number;
  severity: Severity;
  source: EventSource;
  /**
   * Type-specific payload. Known keys:
   * - object_detected: { label: 'cell phone'|'book'|'laptop'|'person'|..., score: number }
   * - gaze_cluster: { direction: string (uk), cx, cy, count, dwellMs, fixationTs: number[] }
   * - gaze_offscreen: { direction: string, gx, gy }
   * - head_turned: { yaw, pitch, direction: string }
   * - face_mismatch / face_reverified: { distance: number }
   * - copy/paste/cut: { length: number }
   * - paused: { reason: 'air_raid'|'blackout'|'other', note?: string }
   * - question_answered: { questionId: string, index: number }
   * - proctor_message: { text: string }
   */
  data?: Record<string, unknown>;
  /** Relative URL of a JPEG snapshot taken at the event (if any). */
  snapshotUrl?: string;
  /** Proctor label after review. */
  label?: 'confirmed' | 'false_positive' | null;
}

/** Event the client sends (server fills sessionId; snapshot uploaded separately). */
export type ClientEvent = Omit<ProctorEvent, 'sessionId' | 'label' | 'snapshotUrl'> & {
  /** Base64 JPEG (no data: prefix), optional, ≤ 60 KB. */
  snapshotJpeg?: string;
};

export interface RiskContribution {
  type: EventType;
  count: number;
  points: number;
  /** Ukrainian explanation, e.g. "Повторювані погляди в одну зону (ліворуч-вниз): 7 разів, 42 с". */
  explanation: string;
}

export interface RiskSummary {
  /** 0..100 */
  score: number;
  level: RiskLevel;
  contributions: RiskContribution[];
  /** Time without observation (offline, camera lost, paused) in ms. Not a violation, but shown. */
  unobservedMs: number;
  observedMs: number;
  computedAt: string;
}

export interface GazeCluster {
  id: string;
  /** Centroid in normalised screen coords. */
  cx: number;
  cy: number;
  /** Ukrainian direction label, e.g. "ліворуч-вниз". */
  direction: string;
  count: number;
  dwellMs: number;
  firstT: number;
  lastT: number;
  fixationTs: number[];
}

export interface Fixation {
  /** Start time. */
  t: number;
  durationMs: number;
  /** Mean gaze point of the run (normalised, off-screen). */
  gx: number;
  gy: number;
  direction: string;
}

export interface SessionAnalysis {
  derivedEvents: Omit<ProctorEvent, 'id' | 'sessionId'>[];
  fixations: Fixation[];
  clusters: GazeCluster[];
}

export type ReviewDecision = 'clear' | 'warning' | 'violation' | 'appeal';

export interface Review {
  decision: ReviewDecision;
  comment: string;
  reviewer: string;
  at: string;
}

export type MediaStreamKind = 'webcam' | 'screen' | 'phone' | 'roomscan';

export interface MediaSegment {
  id: string;
  sessionId: string;
  stream: MediaStreamKind;
  seq: number;
  tStart: number;
  tEnd: number;
  bytes: number;
  /** Hex SHA-256 computed by the client, re-verified by the server. */
  sha256: string;
  hashVerified: boolean;
  mime: string;
  /** Relative URL to fetch the media (proctor token must be appended as ?token=). */
  url: string;
  createdAt: string;
}

export interface ProctorMessage {
  id: string;
  sessionId: string;
  text: string;
  createdAt: string;
  deliveredAt: string | null;
}

export interface Session {
  id: string;
  examId: string;
  studentName: string;
  /** Student-card number as typed by the student. */
  studentNumber: string;
  status: SessionStatus;
  createdAt: string;
  startedAt: string | null;
  submittedAt: string | null;
  /** Total paused time (ms). */
  pausedMs: number;
  lastSeenAt: string | null;
  consent: ConsentRecord | null;
  device: DeviceInfo | null;
  identity: IdentityResult | null;
  calibration: Omit<CalibrationSummary, 'model'> | null;
  risk: RiskSummary | null;
  review: Review | null;
  /** Answers keyed by question id: option indices or free text. */
  answers: Record<string, number[] | string>;
  /** Auto-graded score (single/multi only) and max score. */
  score: number | null;
  maxScore: number | null;
  /** Phone companion currently connected. */
  phoneConnected: boolean;
  /** Is this a synthetic demo session (seeded, no video). */
  synthetic: boolean;
}

/** Row in the proctor's sessions table. */
export type SessionListItem = Pick<
  Session,
  | 'id'
  | 'examId'
  | 'studentName'
  | 'studentNumber'
  | 'status'
  | 'startedAt'
  | 'submittedAt'
  | 'lastSeenAt'
  | 'risk'
  | 'review'
  | 'score'
  | 'maxScore'
  | 'phoneConnected'
  | 'synthetic'
> & {
  identityMatched: boolean | null;
  eventCount: number;
  latestSnapshotUrl: string | null;
};

export interface SessionDetail {
  session: Session;
  exam: Exam;
  events: ProctorEvent[];
  segments: MediaSegment[];
  analysis: Omit<SessionAnalysis, 'derivedEvents'>;
  /** Down-sampled to ≤ 3000 samples for charts. */
  samples: FrameSample[];
  identityImages: { selfieUrl: string | null; idCardUrl: string | null };
  messages: ProctorMessage[];
  audit: AuditEntry[];
}

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: string;
  data?: Record<string, unknown>;
}

/** What the student client needs to run/resume the exam. */
export interface StudentSessionView {
  session: Session;
  exam: PublicExam;
  questions: PublicQuestion[];
  /** Calibration model for live gaze (present after calibration). */
  gazeModel: GazeModel | null;
  /** Enrolment descriptor for in-browser re-verification. */
  enrolmentDescriptor: number[] | null;
  /** Remaining exam time in ms (accounts for pauses), null before start. */
  remainingMs: number | null;
  phonePairUrl: string | null;
  /** Server wall-clock at response time (ISO). Clients use it to estimate clock skew so that
   * t = (Date.now() + skew) − Date.parse(session.startedAt). Pauses are NOT subtracted from t
   * (they appear as gaps on the timeline); remaining time = duration − (t − pausedMs). */
  serverTime: string;
}

export interface TelemetryBatch {
  samples: FrameSample[];
  events: ClientEvent[];
  /** Client clock: t at send time. */
  clientT: number;
}

export interface TelemetryResponse {
  accepted: { samples: number; events: number };
  /** Undelivered proctor messages (marked delivered by this response). */
  messages: ProctorMessage[];
  /** Server may ask the client to stop (exam closed by proctor). */
  command: 'continue' | 'force_submit' | null;
  risk: RiskSummary | null;
}

/** WebSocket messages pushed to proctors on /api/live. */
export type LiveMessage =
  | { type: 'hello'; at: string }
  | { type: 'session_update'; session: SessionListItem }
  | { type: 'event'; event: ProctorEvent }
  | { type: 'snapshot'; sessionId: string; stream: 'webcam' | 'phone' | 'screen'; url: string; at: string };
