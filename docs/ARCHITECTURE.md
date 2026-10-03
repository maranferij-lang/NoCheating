# NoCheating — prototype architecture & build brief

This is the engineering brief for the **demo prototype** (see `docs/PLAN.md` for the product plan).
Goal: a working, touchable web app a student, a teacher (proctor) and a university/government audience
can try end-to-end: join an exam → consent → system check → identity (liveness + ID card face match) →
gaze calibration → (optional phone camera) → proctored exam with on-device ML → proctor reviews an
explainable risk timeline with video evidence → printable report. Plus a **Lab** page that shows live
what the system "sees", and **synthetic demo sessions** so the dashboard is impressive on first open.

All user-facing text is **Ukrainian**. Code, comments and identifiers are English.

## Repository layout & ownership

```
package.json                 npm workspaces; scripts dev / build / start / seed / test / test:e2e
packages/core                @nocheating/core — pure TS, no DOM/Node deps (types, analysis, scoring, simulator)
apps/server                  @nocheating/server — Fastify 5 + better-sqlite3 + @fastify/websocket + @fastify/static
apps/web                     @nocheating/web — Vite 7 + React 19 + React Router 7 + Tailwind 4
  src/lib/api.ts             typed API client = HTTP CONTRACT (architect-owned)
  src/lib/auth.ts            token storage (architect-owned)
  src/ui/*                   UI kit (architect-owned; builders may ADD components in their own folders)
  src/proctoring/*           browser proctoring engine (engine builder)
  src/student/*              student flow pages (student builder)
  src/phone/*                phone companion page (student builder)
  src/proctor/*              proctor dashboard (proctor builder)
  src/landing/*, src/lab/*   landing, transparency page, lab (lab builder)
scripts/setup-assets.mjs     copies MediaPipe wasm + face-api models, downloads MediaPipe models (postinstall)
e2e/                         Playwright tests + fake webcam fixtures (e2e/make-fixtures.mjs)
docs/                        PLAN.md (product), ARCHITECTURE.md (this), DEMO.md (how to demo)
```

**Contracts that must not change shape**: `packages/core/src/types.ts`, exported names/signatures in
`packages/core/src/*.ts` stubs, `apps/web/src/lib/api.ts`, `apps/web/src/proctoring/contract.ts` and
`apps/web/src/proctoring/index.ts` exported names. Adding optional fields/params is fine. If a contract
truly needs a change, make the minimal additive change and mention it in your final report.

**Shared working tree**: several builders work in the same checkout at the same time, each in their own
folders. Only edit files you own. Do not run `npm install` or add dependencies (everything needed is
installed: react, react-router-dom, lucide-react@0.577, clsx, qrcode, idb-keyval, @mediapipe/tasks-vision,
@vladmandic/face-api, fastify, @fastify/websocket, @fastify/static, better-sqlite3, nanoid, vitest, tsx).
When type-checking the web app you may see errors from other builders' unfinished folders — only fix
errors in your own files. Do not commit (the architect commits).

## Conventions

- Session time `t` = wall-clock ms since `session.startedAt`; pauses are gaps (see types.ts header).
- Gaze coords normalised to the student's screen; outside [0,1] = off-screen.
- Head pose: `headPoseFromMatrix` defines the convention; everything else uses it.
- Severity → colour: info slate, low sky, medium amber, high orange, critical red (`ui/Badge.tsx`).
- Ukrainian copy: polite "ви" form for students; concise, calm, non-accusatory ("підозра", "потребує
  перегляду", never "списувач"). The system never says a student cheated; a human decides.
- Accessibility: semantic HTML, labels, focus states, keyboard navigation, aria-live for status.
- Responsive: student and phone pages must work on a 360px-wide phone; proctor dashboard ≥ 1024px
  primary but should not break on tablets.

## packages/core (core builder)

Implement every stub (`todo()` bodies) in `packages/core/src/*.ts`, delete `todo.ts` and
`contract-stubs.md` when nothing imports them. Add vitest tests in `packages/core/test/*.test.ts`
(or `src/*.test.ts`) covering: headPoseFromMatrix on synthetic rotation matrices; ridge regression
recovers a known linear map; dbscan on toy data; fixations merging across blinks/gaps; clusters found for
`notes_left_down` but NOT for `thinker`; analyzeSamples produces face_missing / multiple_faces /
head_turned for crafted inputs and treats sample gaps as unobserved; computeRisk ordering:
honest < thinker < notes_left_down, helper_in_room and identity_swap high/critical, false_positive labels
reduce score, info severity ignored; simulateSession is deterministic per seed; formatters/plurals.

Design notes:
- `extractGazeFeatures`: features should include per-eye iris horizontal/vertical ratios (iris centre
  468/473 relative to eye corners 33/133 and 362/263, lids 159/145 and 386/374), averaged; the 8
  `eyeLook*` blendshapes (In/Out/Up/Down × Left/Right) condensed to horizontal & vertical components;
  head yaw/pitch (degrees/45); face centre x/y and inter-ocular distance (scale). Return null when eyes
  are closed or landmarks are missing.
- `fitGazeModel`: standardise features (std floor 1e-6), ridge closed form via normal equations with
  Gaussian elimination / Cholesky (no deps), lambda default 1.0, bias unregularised.
- Policy presets: soft (faceMissingSec 10, multipleFacesSec 4, headTurnDeg 40, headTurnSec 5, gaze
  offscreenMinMs 1200, longOffscreenMs 8000, clusterEps 0.22, clusterMinPoints 4, clusterMinDwellMs 15000,
  windowMs 300000), standard (6, 2, 35, 4, 900, 5000, 0.2, 3, 8000, 300000), strict (4, 1, 30, 3, 700,
  3000, 0.2, 3, 5000, 300000). All presets: requireIdCard true, requireLiveness true, requireFullscreen
  true, requireSingleMonitor true, allowPaper false, audioVad false (strict true), screenRecording false
  (strict true), phoneCamera 'off' (strict 'optional'), roomScan false, reverifyIntervalSec 60,
  maxPauseMin 30, retentionDays 30.
- `EVENT_META` must cover every EventType with Ukrainian label/description and an icon name from
  lucide-react 0.577 (e.g. UserX, Users, EyeOff, Eye, ScanEye, Smartphone, BookOpen, Laptop, Mic,
  CameraOff, AppWindow, Minimize, Copy, ClipboardPaste, Scissors, MousePointerClick, Code, Monitor,
  Maximize2, MonitorX, Keyboard, WifiOff, Wifi, PauseCircle, PlayCircle, Play, Send, CheckCircle2,
  MessageSquare, Smartphone, UserCheck, UserPlus).
- Risk weights (points before saturation; tune so the simulator scenarios order sensibly):
  face_mismatch 60 (critical floor 70), multiple_faces 35, object_detected phone 30 / book 15 / laptop 15
  / person 25, gaze_cluster 25, speech_detected 15, face_missing 15, tab_hidden 15, paste 15,
  fullscreen_exit 10, window_blur 8, head_turned 8, gaze_offscreen 6, monitor_change 20,
  devtools_suspected 5, copy 4, cut 4, camera_lost 10, screen_share_stopped 12, phone_disconnected 6,
  phone_person_detected 25. Unscored: info events, lifecycle, network, pauses, proctor_message,
  question_answered, face_reverified, resize, context_menu, shortcut_blocked (or tiny weights).
  With accommodations, gaze_* and head_turned are not scored.
- `simulateSession` uses a small seeded PRNG (mulberry32). 5 Hz samples. Realistic noise.

## apps/server (server builder)

Files: `src/app.ts` (`buildApp({ dataDir, proctorPin, logger? }) → FastifyInstance`, used by tests),
`src/index.ts` (listen), `src/db.ts`, `src/repo/*.ts` or similar, `src/routes/*.ts`, `src/live.ts`
(WebSocket hub), `src/media.ts`, `src/analysis.ts`, `src/seed.ts` (CLI: `npm run seed`), `src/retention.ts`.
Tests in `apps/server/test/*.test.ts` with `app.inject` and a temp data dir.

- Implement EXACTLY the routes in `apps/web/src/lib/api.ts` (method, path, body, response types).
  Plus `POST /api/health?upload=1` (accepts ≤ 2 MB octet-stream, discards, returns {ok}),
  `GET /api/media/:sessionId/:stream/:seq` (video, **HTTP Range support → 206**),
  `GET /api/files/:sessionId/*` (selfie.jpg, idcard.jpg, snapshots/<id>.jpg),
  `GET /api/sessions/:id/snapshot/latest?stream=` (latest live JPEG; 404 if none),
  WebSocket `GET /api/live?token=&examId=` pushing `LiveMessage` JSON.
- Auth: proctor login compares PIN (config.proctorPin, default 1234) → random token in
  `proctor_tokens`; accept token from `Authorization: Bearer` or `?token=`. Student token (random 32+
  chars) identifies a session for `/api/student/*`. Phone pair token in path for `/api/phone/*`.
- SQLite (WAL) at `<dataDir>/nocheating.db`; tables: exams, sessions, events, samples
  (PRIMARY KEY(session_id,t)), media_segments, messages, audit_log, proctor_tokens. JSON columns for
  policy/questions/consent/device/identity/calibration/risk/review/answers.
- Media on disk: `<dataDir>/media/<sessionId>/<stream>/<seq:05d>.webm|mp4`; verify client SHA-256
  (`hashVerified`). If `ffmpeg` is on PATH, remux a playback copy `<seq>.play.webm` (`-c copy`) in the
  background so the browser gets duration/cues; serve the play copy when present, keep the original for
  evidence (hash refers to the original). For phone segments compute tStart/tEnd from the server clock
  (receive time − startedAt, duration from headers) because phone clocks are not synced.
- Telemetry: insert samples (INSERT OR IGNORE), client events (INSERT OR IGNORE by id; save
  `snapshotJpeg` to `snapshots/<eventId>.jpg` and set snapshotUrl), then schedule analysis
  (debounced ~2 s per session; immediate on submit and on label change). Analysis = core
  `analyzeSamples` → replace `server_analysis` events using deterministic ids
  (`<sessionId>:<type>:<t>`) and **preserve proctor labels** across recomputes → core `computeRisk`
  over all events (accommodations from consent) with observed/unobserved time → store `risk`, broadcast
  `session_update` (+ `event` for new events). Response returns undelivered proctor messages (mark
  delivered), `command: 'force_submit'` if the proctor forced it or time ran out (> 30 s grace), and risk.
- Pause/resume: status `paused`, store paused_at; resume adds to paused_ms; server creates `paused` /
  `resumed` events (source system; paused data {reason, note}); exceeding policy.maxPauseMin → resumed
  event severity medium with data {overLimit: true}.
- `remainingMs` = durationMin·60000 − (elapsed − pausedMs − current pause).
- Submit: core `gradeAnswers`, status submitted, `exam_submitted` event, final analysis.
- `StudentSessionView`: no `correct` fields ever; include gazeModel, enrolment descriptor, serverTime,
  `phonePairUrl` (`config.publicUrl + '/phone/' + token` or the relative path `/phone/<token>`; the
  client resolves it against location.origin).
- Proctor session detail: downsample samples to ≤ 3000 (core `downsampleSamples`), analysis
  fixations/clusters recomputed on the fly, segments with URLs, identity image URLs, messages, audit log.
  Never return the identity descriptor to proctors (strip it).
- Audit log: proctor login, view_session, review, label_event, message, force_submit, delete_session,
  seed_demo.
- Demo seed (`POST /api/demo/seed` and `npm run seed`): idempotent. Creates exam
  "Демо-іспит: Основи мікроекономіки" (code DEMO26, 60 min, standard policy, 10 good Ukrainian
  microeconomics questions incl. 1 text question) with one synthetic **submitted** session per core
  scenario (synthetic=true, plausible Ukrainian student names from SCENARIOS, consent/device/identity
  filled; identity_swap → matched false), analysis + risk computed; and an open exam
  "Пробний іспит (10 хв)" (code TEST10, 10 min, standard policy, 5 short questions, phoneCamera
  'optional') for live tries. Seed also runs automatically on first start when the DB is empty
  (env `SEED_ON_EMPTY=0` disables).
- Production: serve `apps/web/dist` with SPA fallback (non-/api GETs → index.html); correct MIME for
  .wasm/.task/.tflite. Retention: hourly delete media of sessions older than policy.retentionDays with
  review decision `clear`.
- Errors: `{ error: <Ukrainian message>, code }` with proper status codes; validate inputs.

## apps/web/src/proctoring (engine builder)

Implement everything in `proctoring/index.ts` + `contract.ts` in sibling modules (`vision.ts`,
`faceid.ts`, `camera.ts`, `device.ts`, `recorder.ts`, `queue.ts`, `monitors.ts`, `audio.ts`,
`engine.ts`, `hash.ts`) and the React components listed in `proctoring/components/README.md`
(`CameraView.tsx`, `LivenessCheck.tsx`, `CalibrationOverlay.tsx`, `GazeDot.tsx`).

- MediaPipe: `FilesetResolver.forVisionTasks('/mediapipe/wasm')`; FaceLandmarker
  (`/models/face_landmarker.task`, VIDEO mode, numFaces 3, blendshapes + matrices, GPU delegate with
  CPU fallback); ObjectDetector (`/models/efficientdet_lite0.tflite`, scoreThreshold ~0.45, maxResults 5;
  keep: cell phone, book, laptop, person, remote, tv). Timestamps must be strictly increasing per task.
- face-api: `@vladmandic/face-api`, models at `/models/faceapi` (tinyFaceDetector + faceLandmark68Net +
  faceRecognitionNet; files `*-weights_manifest.json`). Use the WASM or WebGL tfjs backend as available
  (call `faceapi.tf.setBackend` sensibly, `await faceapi.tf.ready()`); thresholds live 0.55, idCard 0.6.
- Engine loop at `analysisHz` with setTimeout (works in background tabs); FrameSamples at ≤ 5 Hz;
  object detection every ~1.5 s with 2-of-3 debounce + 30 s cooldown per label; re-verification every
  policy.reverifyIntervalSec (2 consecutive misses → face_mismatch critical with snapshot; each check →
  face_reverified info with distance); VAD (policy.audioVad, never records audio); browser monitors
  (visibility, blur — not double counted with hidden, fullscreen exit when required, copy/cut/paste
  blocked + reported with length, contextmenu blocked, PrintScreen keydown, devtools heuristic,
  `screen` change → monitor_change, online/offline, camera track ended/muted → camera_lost, screen
  track ended → screen_share_stopped). Events carry a ≤ 60 KB base64 JPEG snapshot where useful.
- Recorder: one self-contained file per 10 s segment (stop/start MediaRecorder), video only, mime
  preference vp9 → vp8 → webm → mp4, 300 kbps webcam / 250 kbps screen (screen track at ~5 fps).
- Upload queue in IndexedDB (idb-keyval custom store), survives reloads/blackouts; telemetry batches
  every 2 s; exponential backoff 1 s → 30 s; resend on `online`; priority telemetry > segments; drop on
  permanent 4xx. `stop(timeoutMs)` flushes. Status via onStatus (≤ 2 Hz).
- Live snapshots: webcam every 10 s (320px JPEG), screen every 15 s, best effort.
- Lab mode: `record:false`, `snapshots:false`, custom no-op `transport`.
- `collectDeviceInfo`: UA parse (core), screens, camera settings/label (core isSuspiciousCameraLabel),
  microphone presence, WebGL renderer (WEBGL_debug_renderer_info) + core isVmRenderer, network.

## apps/web/src/student + src/phone (student builder)

`StudentApp.tsx` with nested routes `/exam/consent|check|identity|calibration|phone|ready|live|done`,
a `StudentFlowProvider` context (studentView, camera stream kept across steps, faceId/vision readiness,
device info, enrolment descriptor, gaze model) and a guard that redirects to the correct step from
server state (no token → /join). `JoinPage.tsx` handles `/join` and `/join/:code` (+ resume an active
session). Use a consistent `StudentLayout` (logo, exam title, Stepper). Details:

- Consent: what is recorded for THIS exam's policy, what is never done (no emotion recognition, no
  audio recording, no room scan unless policy, no automatic penalties — a human decides), retention,
  who sees the data, rights (access, deletion, appeal), alternative (in-person exam via the dean's
  office), accommodations checkbox + note. Required checkboxes; "Не погоджуюсь" → alternative screen.
- System check: camera, models loading with progress, face & lighting quality, benchmark → analysisHz,
  screens (block if extended and policy requires single monitor, with instructions), browser features,
  network, virtual camera / VM warnings, microphone if VAD. Then `api.submitDevice`.
- Identity: selfie with face-guide oval + LivenessCheck (if policy) → capture + descriptor; ID card
  capture via camera (with framing guide) or file upload → face on card → distance → match result;
  graceful fallbacks (manualReviewRequired). A disabled "Підтвердити через Дія" button labelled
  "Заплановано" with an explanation (integration needs an agreement with Мінцифри). Upload images,
  `api.submitIdentity` (include descriptor).
- Calibration: explanation → CalibrationOverlay → quality result with tips; retry; accommodations may skip.
- Phone (only if policy.phoneCamera ≠ 'off'): `api.phonePair` → QR (qrcode) for the absolute URL;
  placement tips; wait for `phoneConnected` (poll studentView); warn when the page is on localhost
  (phone cannot reach it → use LAN IP over HTTPS or a tunnel, see README). Optional → skippable.
- Ready: checklist, rules, screen share (if policy), fullscreen (if policy), "Почати іспит" → `api.startExam`.
- Live exam: header (title, remaining timer, sync/queue indicator, red "Іде запис" dot, pause button),
  question navigator (one question per screen, grid of numbers with answered state), autosave answers
  (debounced `api.saveAnswers` + `engine.emit({type:'question_answered', ...})`), small mirrored
  self-view with face status, collapsible "Що зараз фіксується" transparency panel (plain-language
  recent events), proctor messages (modal), offline banner, fullscreen-exit overlay, pause modal
  (reason: повітряна тривога / відключення світла / інше) → `api.pause` + `engine.pause` → calm pause
  screen with elapsed pause timer → resume = quick face re-check → `api.resume` + `engine.resume`;
  submit confirm (unanswered count) → `engine.stop` → `api.submitExam`; auto-submit at time-up or on
  `force_submit`. Survive reloads (re-open camera; ask to re-share screen).
- Done: upload progress until the queue is empty ("не закривайте вкладку"), what happens next, appeal info.
- Phone page `/phone/:pairToken` (mobile-first): info → start rear camera → `phoneHello` → segment
  recording (`createSegmentRecorder`, kind 'phone') + direct upload with retry → snapshots every 5 s →
  Wake Lock → poll `phoneTelemetry` every 5 s; stop when the session is submitted; `phoneBye` on stop.
  Optional person counting via ObjectDetector every 3 s (≥ 2 persons → phone_person_detected).

## apps/web/src/proctor (proctor builder)

`LoginPage.tsx` (name + PIN, demo hint "PIN для демо: 1234") and `ProctorApp.tsx` (layout + nested
routes `''`, `exams/new`, `exams/:id`, `exams/:id/edit`, `sessions/:id`, `sessions/:id/report`;
redirect to login without token).

- Dashboard: exam cards with counts; "Створити іспит"; "Завантажити демо-дані" (`api.seedDemo`).
- Exam editor: title, description, duration, status, policy preset + detailed toggles (POLICY_LABELS),
  question editor (single/multi/text, options, correct answers, points; add/remove/reorder).
- Exam page: big join code + copy + `/join/CODE` link + QR; open/close toggle; tabs "Студенти"
  (sessions table sorted by risk: name, number, status with live dot, identity, risk bar+level, top
  contributions chips, events, score, decision; filters), "Наживо" (grid of live snapshots updated via
  WebSocket, risk, last event), "Налаштування" (policy summary); CSV export. Live updates via
  `liveSocketUrl(examId)` with auto-reconnect.
- Session review: header (student, status, risk gauge, decision); **SegmentPlayer** (plays consecutive
  10 s segments as one continuous timeline; stream switch webcam/screen/phone; seek to any t);
  **Timeline** (SVG lanes: faces, gaze off-screen fixations coloured by cluster, head yaw, browser,
  objects/audio, pauses/unobserved gaps; event markers → seek; playhead); side tabs: Події (labels
  confirmed/false positive → risk refresh, snapshots), Ризик (contribution bars + explanations +
  disclaimer that the score prioritises review, it is not proof), Погляд (**GazeHeatmap** canvas: screen
  rectangle + off-screen surroundings, density, cluster centroids with direction labels), Особа (selfie
  vs ID card, match score, liveness, re-verification history), Пристрій, Повідомлення (send to student
  while live), Журнал (audit). Decision panel (clear/warning/violation/appeal + comment). Live session:
  live snapshot, message, force submit. Synthetic session banner (no video).
- Report page: printable A4 protocol (exam, student, times, identity, risk & contributions, events
  table, clusters, decision, SHA-256 evidence table, generated-at, appeal note) + print button.

## apps/web/src/landing + src/lab (lab builder)

- Home: hero ("Доброчесний онлайн-іспит без тотального стеження"), three entry cards (student /join,
  teacher /proctor, Lab /lab), how it works (steps), principles (людина вирішує; мінімізація; прозорість;
  стійкість до тривог і блекаутів; українське право і GDPR), honest "Прототип" disclaimer, footer.
- How it works / transparency (`/how`): what is collected and why (from EVENT_META), what is never
  done (emotion recognition is banned in education by EU AI Act Art. 5(1)(f); no audio recording; room
  scan off by default; no automatic penalties), retention, rights, accuracy limits (webcam gaze ≈ several
  degrees; false positives; accommodations), legal notes (Закон 2297-VI, законопроєкт 8153, GDPR).
- NotFound page.
- Lab (`/lab`): camera with overlays (face boxes, mesh/iris toggle, object boxes), live metrics (faces,
  yaw/pitch/roll, blink, jawOpen, quality, fps, delegate), objects list, "Калібрувати погляд"
  (CalibrationOverlay) → GazeDot + on/off-screen indicator, rolling fixations & clusters (core) and a
  live local risk score (core analyzeSamples + computeRisk over local samples & engine events, preset
  selector), event feed, and a "Сценарії для демонстрації" checklist that ticks itself when detected
  (5 glances to one side, phone in frame, second person, tab switch, leave frame 10 s, paste text).
  Runs ProctoringEngine with record:false/snapshots:false and a local transport. Nothing leaves the browser
  (say so on the page).
