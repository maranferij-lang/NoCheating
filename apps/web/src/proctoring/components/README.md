Reusable proctoring React components (owned by the engine builder), used by src/student and src/lab:

- `CameraView` — <video> bound to a MediaStream (muted, playsInline, mirrored for the user) with an
  optional overlay canvas drawing face boxes, landmarks/iris, object boxes. Props:
  `{ stream: MediaStream | null; mirrored?: boolean; overlay?: { frame?: VisionFrame | null; objects?: ObjectDetection[]; showMesh?: boolean }; className?: string; videoRef?: React.Ref<HTMLVideoElement> }`
- `LivenessCheck` — runs 3 challenges from core.pickChallenges with big Ukrainian prompts and a
  progress ring; props `{ video: HTMLVideoElement; onDone(result: LivenessResult): void; onSkip?(): void }`.
  After 2 failed attempts offers "Продовжити без перевірки (потрібна ручна перевірка)" (Continue without verification, manual review required).
- `CalibrationOverlay` — fullscreen 9-point calibration + 4-point validation using core
  CALIBRATION_POINTS/VALIDATION_POINTS, fitGazeModel, evaluateGazeModel, calibrationQuality.
  Props `{ video: HTMLVideoElement; onDone(result: CalibrationSummary): void; onCancel(): void }`.
  Each point: animated shrinking dot, ~1.2 s settle + ~1.0 s collection; skips frames without a face.
- `GazeDot` — fixed-position dot showing live gaze (lab + optional student debug).
