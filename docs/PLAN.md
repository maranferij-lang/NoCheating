# NoCheating: implementation plan for an online proctoring system for Ukrainian universities

> Status: brainstorm / architecture plan. No code is being written. The repository is empty.
> Document language: English (translated from the Ukrainian original). Date: 2026-10-03.

---

## 0. Context

Ukrainian universities have moved teaching and assessment online on a large scale (the war, air raid alerts, blackouts, relocated students). This creates an academic integrity problem during remote tests and credit exams. The idea: a web application that, with the student's consent:

1. verifies identity (face + student card / ID card),
2. scans the room with a phone,
3. records the camera during the test and analyzes gaze / head position,
4. produces "suspected cheating" flags for the instructor to review.

This document covers: an honest assessment of the idea, the product model, architecture, technologies, capacity estimates, legal constraints, risks, a step-by-step roadmap and open decisions.

---

## 1. Honest assessment of the idea (TL;DR)

**The idea is viable, but with two critical corrections.**

| What is proposed | Assessment | Correction |
|---|---|---|
| Face verification + document | Strong. Industry standard. Ukraine has a unique advantage: **Diia** (the state e-services app, with a digital student card and passport) | Use Diia.Sharing / Diia.Signature as the main path, OCR + face match as a fallback |
| Room scan with a phone | **Legally toxic.** In the US a court ruled room scans unconstitutional (Ogletree v. Cleveland State, 2022). In the EU, Proctorio has been challenged repeatedly under GDPR. Students hate this feature the most | Make it an **optional university policy**, off by default. Do not build it for the MVP |
| Eye tracking as a cheating detector | **A weak signal on its own.** Webcam gaze has an accuracy of ~4° in ideal conditions and degrades with glasses, poor lighting and weak cameras. Neurodivergent students, people with nystagmus, and the habit of looking at the ceiling while thinking → false positives | Gaze = **one of 8-10 signals** aggregated into a "suspicion level". The system **does not issue a verdict**, it prepares evidence for a human |
| "Often looks at a particular corner" | This is the best part of the gaze idea. Clustering gaze directions over time really does separate "lost in thought" from "reading a cheat sheet on the side" | Implement as clustering of off-screen fixations (DBSCAN) + dwell time + correlation with pauses in input |

**The key shift in positioning:** not "AI that catches cheaters", but **"a tool that makes a remote exam legally defensible and gives the instructor evidence for a decision"**. Automatic verdicts = scandals, appeals, lawsuits. Human-in-the-loop = a product a university will actually buy.

---

## 2. Who the users are and what they buy

### Roles

| Role | What they do | What matters to them |
|---|---|---|
| **Student** | Goes through onboarding, verification, the exam | Not humiliating, works on a weak laptop, does not crash during a blackout, clear about what exactly is recorded |
| **Instructor / proctor** | Creates the exam, sets the strictness policy, reviews flags, makes decisions | 300 students → I do not want to watch 450 hours of video. I want 15 minutes per group: a timeline with clips of suspicious moments |
| **University administrator** | Connects Moodle, manages policies, is responsible for personal data | Legal compliance, data residency, reports, integration with the existing LMS |
| **Appeals committee** | Reviews appeals | The full recording, immutability of evidence (hashes, timestamps), transparency of signals |

### Delivery model

- **B2B SaaS for universities**, paid per exam-student or as an annual license per faculty.
- **Moodle integration is mandatory** (the de facto standard in Ukrainian universities: VNU, ChNU, MNU, KROK, Alfred Nobel...). Without it the product will not sell: nobody will migrate their tests.
- Later: Google Classroom, Canvas, a custom test module.

---

## 3. Product flows

### 3.1 Student onboarding (once per semester)
1. Redirect from Moodle (LTI 1.3 deep link) → consent screen: **what exactly is recorded, how long it is stored, who sees it, how to appeal**. Separate consent for biometrics (a separate checkbox).
2. Device check: camera, microphone, browser, network speed, CPU benchmark (can it handle on-device ML).
3. Reference face photo (3 frames + liveness: turn the head, blink).
4. Identity verification, two paths:
   - **A (main):** Diia.Sharing → the student confirms in Diia the transfer of a copy of the student card / passport. We receive the verified full name + photo from the document. Face match against the reference.
   - **B (fallback):** a photo of the document held to the camera → OCR (full name, number) → manual check by a proctor or a face match against the photo on the document.
5. Gaze calibration: a 9-point grid (look at the points for 2-3 sec). We store a personal model.

### 3.2 Before the exam (5 min)
1. Repeat face match (anti-substitution).
2. Checks: single monitor (`window.getScreenDetails()` / comparing `screen` vs `window`), fullscreen, prohibited extensions (heuristic), virtual camera (heuristic based on the device name `MediaDeviceInfo.label`: OBS, ManyCam, Snap Camera).
3. **Optional (per university policy):** room scan, a 20-second video from the phone via a QR code → a second WebRTC stream. Not implemented in the MVP.
4. Optional: the phone as a second camera at the side/rear (stays on the desk for the whole exam). This gives more than a room scan and is less invasive, because it looks at the desk and screen, not the room. A serious competitive advantage, since few do this well.

### 3.3 During the exam
- The student takes the test **in Moodle** (we do not replace the test engine). Our client runs in a companion tab or as an overlay via an LTI iframe.
- In the student's browser: video capture, on-device ML (face, head, gaze, objects), event recording, chunked upload.
- Browser events: loss of focus, leaving fullscreen, tab switching, copy/paste, window resize, device connections, network down/up.
- Audio: only VAD (voice activity detection) + volume level. **We do not record audio by default** (a separate consent checkbox). If we do record, only fragments around events.
- **Blackout / alert:** the student presses "Pause (alert)" → the proctor gets a notification, the test timer in Moodle is paused (via the Moodle web service, if the university allows it), and the recording is marked. If the connection drops without a pause, the client buffers events locally (IndexedDB) and uploads them after reconnecting. Losing the connection is **not a flag** by itself, but a marker of a "period without observation".

### 3.4 After the exam (proctor)
- A list of students sorted by suspicion level (0-100) with a breakdown by signal.
- For each student: a 90-minute timeline with markers; click a marker → a 10-second clip before/after; gaze heatmap; a "number of faces" chart; a log of browser events.
- Buttons: "Clear", "Warn", "Violation (with a comment)", "Send to appeal".
- Export of a PDF protocol with video hashes (evidence for the appeals committee).
- Proctor feedback ("this is not a violation") → a dataset for calibrating thresholds.

---

## 4. Architecture

```
┌─────────────────────────┐        ┌──────────────────────────┐
│  Student browser        │        │  Student phone (PWA)      │
│  - Next.js/React SPA    │        │  - QR pairing             │
│  - MediaPipe Tasks WASM │        │  - WebRTC second camera   │
│  - ONNX Runtime Web     │        │  - (opt.) room scan       │
│  - MediaRecorder chunks │        └────────────┬─────────────┘
│  - Event collector      │                     │
│  - IndexedDB buffer     │                     │
└───────────┬─────────────┘                     │
            │ HTTPS (chunks, events)  WebRTC    │
            ▼                                   ▼
┌───────────────────────────────────────────────────────────────┐
│  API Gateway / BFF (NestJS or FastAPI)                        │
│  - Auth (LTI 1.3 + OIDC), exam sessions, policies             │
│  - Presigned S3 URLs for chunk upload                         │
│  - Event ingest → Kafka/Redpanda (or NATS for simplicity)     │
└──────┬──────────────┬───────────────────┬─────────────────────┘
       │              │                   │
       ▼              ▼                   ▼
┌────────────┐ ┌──────────────┐ ┌──────────────────────────────┐
│ PostgreSQL │ │ S3-compatible│ │ ML Workers (Python)          │
│ (metadata, │ │ (MinIO/      │ │ - face match (InsightFace)   │
│  events,   │ │  Hetzner/    │ │ - post-hoc object detection  │
│  scoring)  │ │  Ukr. cloud) │ │ - audio VAD                  │
│ + Timescale│ │ + lifecycle  │ │ - aggregation / scoring      │
└────────────┘ └──────────────┘ └──────────────────────────────┘
       ▲
       │ LTI 1.3 / Moodle Web Services
┌──────┴─────────────┐        ┌──────────────────────────────┐
│  University Moodle │        │  Diia (Sharing / Signature)  │
│  (tests, grades)   │        │  - document verification     │
└────────────────────┘        └──────────────────────────────┘
       ▲
┌──────┴─────────────┐
│  Proctor dashboard │  (the same React SPA, a different role)
└────────────────────┘
```

### Key architectural decision: client-side ML (edge-first)

**Why:** 300 students × 90 min = 450 hours of video per exam. Analyzing that on the server in real time = a GPU farm and a lot of money. Instead:
- **On the client (realtime):** MediaPipe Face Landmarker (478 points, 52 blendshapes, head rotation matrix) at ~15-30 fps on an average laptop via WASM+WebGL. A lightweight object detector (YOLOv8n / EfficientDet-Lite0 via ONNX Runtime Web) at 1 fps. We generate **events**, not a stream of raw data.
- **On the server (batch, post-hoc):** only verification of flags with heavier models on selected fragments, face match, aggregation.
- **The video is recorded** compressed (640×360, 10-15 fps, VP9 ~300-400 kbps) and stored as evidence, but it is not analyzed frame by frame on the server, except for suspicious windows.

This cuts server costs by 1-2 orders of magnitude and allows running on cheap VPSs.

**Trade-off:** weak laptops (Celeron, 4 GB RAM) will not cope. We need **graceful degradation**: a pre-test benchmark → on a weak device, lower the analysis fps to 3-5, turn off client-side object detection, and compensate with server-side analysis for that student.

---

## 5. Modules in detail

### 5.1 Identification

| Component | Technology | Notes |
|---|---|---|
| Diia.Sharing | REST API integration.diia.gov.ua, test token → contract → production | Free for business, but a contract is required and the demo runs in a test environment. A legal entity status is needed. The student card is available in Diia as a document |
| Face detection + embedding | InsightFace (ArcFace, buffalo_l) on the server, Python | Once per session, CPU is enough (~50 ms/face) |
| Liveness | Active: head turns, blinking (MediaPipe blendshapes). Passive: later | Against a photo on a phone screen |
| Document OCR (fallback) | PaddleOCR (supports Cyrillic) or Tesseract + ukr | Webcam photo quality is low → often a manual check |
| Anti-substitution during the exam | Face match every 2-5 min against the reference (embedding on the client via a small model, or a snapshot sent to the server) | The cosine distance threshold is calibrated in the pilot |

**Problems:** twins, major changes in appearance, hijab/glasses, a document photo that is 5 years old. Solution: there is always a manual path via the proctor.

### 5.2 Gaze and head position (the core of the idea)

**Stack:** MediaPipe Face Landmarker (Tasks API, Web). It provides:
- 478 3D landmarks, including the iris (indices 468-477),
- `facialTransformationMatrixes` → head yaw/pitch/roll,
- blendshapes `eyeLookOutLeft`, `eyeLookInRight`, `eyeLookUp*`, `eyeLookDown*`, `eyeBlink*`.

Important: Google states directly that iris tracking **does not determine where a person is looking**. Gaze must be derived from a combination of: iris position in the eye socket + head pose + personal calibration (9 points → linear/polynomial regression or a small MLP trained in the browser in 10 sec).

**Algorithm for detecting "looks at a corner":**
1. Every 100 ms: the gaze vector (yaw, pitch) after calibration → projection into screen coordinates. Outside the screen = an off-screen fixation with a direction.
2. Filter: Kalman / sliding median window (remove jitter). Ignore fixations < 400 ms (saccades, blinks).
3. Accumulate off-screen fixations over a sliding 5-minute window.
4. **DBSCAN** on directions (yaw, pitch): if there is a cluster with ≥ N fixations and a total dwell ≥ T seconds → "repeated glances at one zone" (a strong signal). Scattered glances in different directions → a weak signal (the person is thinking).
5. Correlation with other events: a glance at the zone → an answer is entered 2-5 sec later (a "looked, then wrote" pattern) strengthens the signal; a glance at the zone while reading a long question weakens it.
6. Output: not "cheating", but a `GAZE_CLUSTER{direction, dwell, count, confidence}` event with a clip.

**Thresholds are set by university policy** (soft / medium / strict) and calibrated on pilot data labeled by proctors.

**Known problems:**
- Glasses with glare → the irises are not detected → fall back to head pose only (a hybrid scheme, as in the Manipal research).
- Two monitors: the second monitor looks like an off-screen cluster. Hence the single-monitor check before the exam.
- A student with paper and a pen (allowed in many exams!) looks down constantly. → the exam policy has an "allowed scratch paper" field that dampens the "looking down" signal.
- Accuracy of 4° under the best conditions means we will **not** distinguish "looking at a phone next to the keyboard" from "looking at the keyboard". Admit this honestly in the proctor UI: show the clip, do not assert the fact.

### 5.3 Other signals (without them gaze is useless)

| Signal | How | Weight |
|---|---|---|
| Face absent > 10 sec | MediaPipe face count = 0 | High |
| Two or more faces | face count ≥ 2 | High |
| Another person (face match failed) | embedding mismatch | Critical |
| Phone / book in frame | YOLOv8n (COCO: cell phone, book, laptop) on-device at 1 fps + server-side clip check with a heavier model | Medium (many false positives on remotes, bottles) |
| Lips moving + voice (without audio recording) | blendshapes `jawOpen`, `mouthFunnel` + VAD | Medium |
| Leaving fullscreen / losing focus / switching tabs | `visibilitychange`, `blur`, `fullscreenchange` | Medium-high (but Moodle is in the same tab, handle with care) |
| Copy/paste of large amounts of text | `paste` event, length | Medium |
| Second monitor | `getScreenDetails`, `screen.isExtended` | High before the start |
| Virtual camera / VM | device label, WebGL renderer string (VMware, VirtualBox), no GPU | Medium (heuristics can be bypassed) |
| Abnormal answer speed | from Moodle: time per question vs difficulty | Medium, requires integration with Moodle logs |
| Window size / DevTools | resize + `console` timing trick | Low |

**Scoring:** a weighted sum with time decay + rules ("a critical event → straight to the top of the list"). In the MVP: simple rules and weights in a config. Later: logistic regression / gradient boosting on data labeled by proctors. **Never a black box:** the proctor sees which signals produced the points.

### 5.4 Recording and storage

- `MediaRecorder` → WebM/VP9 (Chrome, Edge, Firefox), H.264/MP4 in Safari (Safari is a headache, test it separately).
- 10-second chunks → IndexedDB → upload via a presigned URL (S3 multipart). When the network drops, chunks wait locally (browser quota limit ~500 MB → 90 min at 400 kbps ≈ 270 MB, fits).
- Server-side stitching (ffmpeg concat) after the exam, generation of clips around events, a thumbnail strip for the timeline.
- **A hash of every chunk** (SHA-256) is written to the DB immediately → immutability of evidence for appeals.
- Lifecycle: video without flags is deleted after 14-30 days; video with flags is kept until the appeal period closes (set by the university, typically 1 semester). Face embeddings are deleted after the semester.
- Encryption at rest (SSE-S3 or client-side with the university's key), TLS in transit.

### 5.5 Moodle integration

- **LTI 1.3 Advantage** (Tool Provider): launch from the course, NRPS (student list), AGS (we return the "proctoring status" as a grade/marker).
- Pausing the timer and reading answer logs requires a **Moodle Web Services** token from the university admin or a **custom Moodle plugin** (a quizaccess rule, PHP), as in Safe Exam Browser. A plugin like `quizaccess_nocheating`: it does not let the test start without an active proctoring session. This is Phase 2.
- A quick-start alternative: our client opens Moodle in an `iframe` inside our fullscreen page. Problem: `X-Frame-Options` in Moodle often forbids this. It needs configuration on the university side.

### 5.6 Mobile companion (phone)

- A **PWA**, not a native app in the MVP (no store review, one codebase).
- Pairing by QR code → WebRTC through an SFU (self-hosted LiveKit or mediasoup), or simply MediaRecorder + upload the same way as the desktop.
- Functions: (a) a second camera at the side for the whole exam; (b) room scan per policy; (c) a backup channel if the laptop webcam is broken.
- Problems: the phone drains in 90 min with the camera on; the screen turns off (Wake Lock API); iOS Safari PWA restrictions on background camera use. The UX needs a "put it on a charger" prompt.

### 5.7 Proctor dashboard

- React + a timeline component (vis-timeline or a custom canvas one), a video player that can seek to markers (hls.js or a plain `<video>` with byte-range).
- Live mode (seeing 20 students in a grid in real time) is **Phase 3**, because it requires an SFU and completely different infrastructure. For the MVP: asynchronous review after the exam + only a realtime event feed (WebSocket).

---

## 6. Technology stack (recommendation)

| Layer | Choice | Why / alternatives |
|---|---|---|
| Frontend | **TypeScript, React, Next.js** (or a Vite SPA) | Large ecosystem, MediaPipe and ONNX have JS SDKs. Alternative: SvelteKit |
| On-device ML | **MediaPipe Tasks Vision (Web)** + **ONNX Runtime Web** (WebGPU → WebGL → WASM fallback) | TF.js as an alternative for YOLO |
| Backend API | **NestJS (TS)** or **FastAPI (Python)** | One language with the frontend (TS) or closeness to ML (Python). Recommendation: NestJS for the API, Python for ML workers |
| Queue | **NATS JetStream** (simple) or Redpanda/Kafka | For the MVP, PostgreSQL + BullMQ (Redis) is enough |
| DB | **PostgreSQL 16** (+ TimescaleDB for events, if needed) | Prisma / Drizzle ORM |
| Storage | **S3-compatible**: self-hosted MinIO or an object store from a Ukrainian cloud | Data residency in Ukraine may be a university requirement |
| ML server | Python 3.12, InsightFace, Ultralytics YOLO, ffmpeg, Celery/Arq | GPU: one T4/L4 for the pilot, or CPU-only with overnight processing |
| Realtime | WebSocket (Socket.io) for events; LiveKit for live video (Phase 3) | |
| LTI | `ltijs` (Node) or `pylti1p3` | |
| Auth | LTI OIDC + own JWT; for admins, Keycloak or Auth.js | |
| Infra | Docker Compose → k3s/Kubernetes; Terraform | Hetzner (cheap, EU) or Ukrainian clouds (De Novo, GigaCloud) for residency |
| Observability | OpenTelemetry, Grafana, Sentry | Critical: students' sessions "drop off", and we need to see why |
| Tests | Vitest/Playwright (frontend), pytest (ML), synthetic videos for detector regression | |

---

## 7. Capacity and cost (estimate for a pilot: 1 university, 2000 students, peak 300 concurrent)

### Traffic and storage
- 1 student × 90 min × 400 kbps ≈ **270 MB**.
- 300 concurrent → **~120 Mbps** of inbound traffic (normal for any VPS/cloud).
- One exam for 300 students → **~80 GB**. 50 exams/semester → **4 TB** without a lifecycle; with "clean" recordings deleted after 14 days, about 0.5-1 TB is actually stored.
- S3-like storage cost: ~$5-25/TB/month → **$10-50/month** for the pilot.

### Compute
- API + DB + queue: 2-4 vCPU, 8 GB RAM → **$20-40/month**.
- ML workers (post-hoc): face match on CPU is instant; checking flags with YOLOv8m on a T4 GPU ≈ 300-500 fps → 300 students × 10 min of suspicious fragments × 2 fps = 360k frames ≈ **15-20 minutes of GPU** per exam. On-demand GPU rental ~$0.5-1/hour → pennies. Or CPU-only overnight.
- Live proctoring (Phase 3): LiveKit SFU, 300 streams at 400 kbps → ~120 Mbps, 4-8 vCPU → **+$50-100/month**.

**Pilot total: ~$100-200/month of infrastructure.** The main cost is people, not servers. This is a consequence of the edge-first architecture.

### Client limits
- MediaPipe Face Landmarker: ~20-30 fps on an 8th-generation Intel i5 / M1; ~8-12 fps on a Celeron N4020 (a typical cheap student laptop). A benchmark and adaptive fps are needed.
- Memory: MediaPipe WASM ~100-150 MB, ONNX YOLOv8n ~50 MB, IndexedDB buffer up to 300 MB. On a 4 GB laptop with Chrome this is at the limit. Firefox/Safari are worse.
- Mobile internet on 3G (a village, a blackout, tethering from a phone): 400 kbps upload may not hold → adaptive bitrate (drop to 150 kbps and 5 fps).

---

## 8. Legal framework (unavoidable, it shapes the product)

### Ukraine
- **Current:** the Law "On Personal Data Protection" No. 2297-VI (2011). Biometrics is not explicitly singled out as a special category, but processing health data / special data requires consent.
- **Upcoming:** bill **No. 8153** (a new version, GDPR-like) passed its first reading on 20.11.2024 and, as of the end of 2025, is being prepared for the second reading. It introduces a definition of **biometric data** (a digitized face), a mandatory DPO, large fines and DPIA. **Design for 8153/GDPR from the start**, because it will be in force before the product reaches the market.
- Students abroad (there are many) → **GDPR applies** directly if the university processes data of EU residents.
- Education regulation: the Ministry of Education and Science has no single norm on proctoring; each university approves its own "Regulation on remote knowledge assessment". The product should give universities a **template regulation and consent form**.

### What follows for the design
1. **Student consent under unequal power (student vs university) is legally doubtful** under GDPR. So the university **is obliged to offer an alternative** (an in-person exam, an exam on Zoom with a live proctor). The product must provide for this alternative in the UI ("I do not agree" → contact the dean's office).
2. **Minimization:** by default we do not record audio, do not scan the room, delete clean recordings quickly, and do not pass embeddings to third parties.
3. **DPIA** (impact assessment): prepare a template for universities. We act as the processor, the university as the controller. A data processing agreement (DPA).
4. **Algorithm transparency:** the student has the right to know by what criteria they are assessed. A public document "Which signals we record".
5. **No automated decisions** with legal consequences (Art. 22 GDPR, an analogue in 8153). A human always makes the decision.
6. **Data residency:** universities, especially public ones, may require storage in Ukraine. Build in a choice of storage region.
7. **Precedents:** Ogletree v. Cleveland State (room scan = a Fourth Amendment violation, US); complaints against Proctorio in the Netherlands and Germany under GDPR. All competitors that relied on aggressive surveillance suffered reputational damage.

---

## 9. Risks and problems (full list)

### Technical
| Problem | Severity | Mitigation |
|---|---|---|
| Blackouts and connection loss in the middle of an exam (specific to Ukraine) | Critical | Local buffer, auto-reconnect, "period without observation" as a neutral state, a pause button for alerts, sync with the Moodle timer |
| Weak student laptops | High | Pre-test benchmark, adaptive fps, server fallback, minimum requirements published |
| Safari / iOS | High | Separate testing; in the MVP we officially support Chrome/Edge/Firefox, Safari "best effort" |
| Cheap 480p webcams, backlighting | High | Frame quality pre-test, tips for the student (light from the front), a quality threshold below which gaze is turned off and only head pose remains |
| Glasses, glare, strabismus, nystagmus, ptosis | High (and ethical) | Hybrid fallback; a "special needs" field in the student profile that turns off gaze signals; a human always decides |
| Workarounds: a virtual camera with a prerecorded video, a second device out of frame, an earpiece, a person out of frame prompting through chat | High | Heuristics against virtual cameras; a second camera from the phone (makes bypassing much harder); audio VAD; periodic "live" challenges (turn the head on request). Honestly: **there is no 100% protection**; the goal is to raise the cost of cheating and provide evidence |
| Deepfake / real-time face swap | Medium (growing) | Liveness challenges, artifact analysis on the server, a second camera |
| Video archive leak | Critical (reputationally fatal) | Encryption, short retention, RBAC, an audit log of proctor access, a pentest before production |
| False positives overwhelm the proctor | High | Threshold calibration in the pilot, a feedback loop, a prioritization UI |

### Ethical and social
- Students perceive proctoring as distrust and surveillance. Resistance, petitions, social media posts. → Transparency, minimization, involving the student council in designing the consent, a public "what we do not do".
- Bias: face detection models have historically worked worse on darker skin and non-standard features. MediaPipe is decent now, but **it must be tested on a diverse sample** and documented.
- Neurodivergent students (ADHD, autism): restlessness, avoiding looking at the screen → false flags. → A special-needs profile, an inclusive policy.
- Students in shelters, shared rooms, or with children: "a second person in frame" is not cheating. → The proctor sees context, not a verdict.

### Business
- Ukrainian universities are poor; public procurement goes through Prozorro; long sales cycles (a semester). → Freemium for one faculty, grants (USAID/EU digital education), partnership with the Ministry of Education and Science / Diia.Education.
- Competitors: Proctorio, Honorlock, Respondus (expensive, English-language, not integrated with Diia). The Russian Examus/ProctorEdu are unacceptable for the Ukrainian market for obvious reasons. **The niche "Ukrainian, with Diia, built for our blackouts and law 8153" is really empty.**
- Team: at least 1 frontend (ML-in-browser), 1 backend, 0.5 ML/Python, 0.5 designer/UX researcher, a lawyer on consultation. 3-4 people for the MVP.

---

## 10. Roadmap

### Phase 0: Discovery (2-4 weeks, no code or with prototypes)
- 5-10 interviews with instructors and 10-20 with students (what hurts, what is not tolerated).
- 1-2 partner universities for the pilot (letter of intent).
- Legal consultation: 8153, consent, a DPIA template.
- Technical spikes (throwaway prototypes, to be discarded):
  - MediaPipe Face Landmarker in the browser → yaw/pitch + iris ratio → calibration → heatmap. Check accuracy on 5 people with different cameras.
  - MediaRecorder chunked upload with a network drop.
  - Diia: apply for a test token (the bureaucracy runs in parallel).

### Phase 1: MVP (8-12 weeks)
Goal: one pilot exam for 30-100 students at one university.
- Monorepo (pnpm workspaces or Turborepo): `apps/web` (student + proctor), `apps/api`, `services/ml`, `packages/shared`.
- Student: consent, device check, reference face, calibration, recording + events, chunked upload, buffer, pause.
- Signals: face 0/2+, face mismatch, off-screen gaze with clustering, head pose, focus/tabs/fullscreen, second monitor.
- Proctor: list, timeline, clips, decisions, PDF export.
- Moodle integration: LTI 1.3 launch (without timer pause).
- Infra: Docker Compose on one server, MinIO, PostgreSQL, Grafana.
- Without: room scan, phone, audio, live mode, Diia (if the token has not been received yet, the OCR fallback).

### Phase 2: Pilot and calibration (6-8 weeks)
- 3-5 real exams, labeling by proctors, collecting FP/FN, tuning thresholds.
- Diia.Sharing in production.
- Phone as a second camera (PWA, WebRTC or upload).
- Moodle `quizaccess` plugin + timer pause.
- Special-needs profile, audit log, DPA/DPIA documents.
- Pentest.

### Phase 3: Scale (later)
- Live mode (SFU), proctor↔student chat.
- ML scoring on labeled data instead of manual weights.
- Multi-tenant, billing, Prozorro readiness.
- Room scan as an option (only if universities insist and the lawyers agree).
- Integrations: Google Classroom, Canvas, a custom test module.

---

## 11. Pilot success metrics
- Technical: ≥ 95% of sessions completed without losing the recording; p95 client load time < 10 sec; share of devices that fail the benchmark < 10%.
- Detection quality: precision of the top 10% by suspicion level ≥ 60% (confirmed by a proctor); recall on staged test violations ≥ 80%.
- Proctor: time to review a group of 100 students ≤ 60 min.
- Students: NPS no lower than -20 (nobody likes proctoring, but there must be no hatred); < 5% consent refusals.
- Legal: 0 data incidents; DPIA approved by the university.

---

## 12. Open decisions (my defaults, unless you object)

1. **Delivery format:** B2B SaaS + Moodle LTI (default) vs standalone with its own tests. → Default: Moodle-first.
2. **First customer:** is there a specific university yet? Without one, Phase 0 starts with finding a partner.
3. **Room scan in the MVP:** no (default), because of legal risks and reputation.
4. **Audio:** only VAD without recording (default).
5. **Data residency:** Ukraine (default) or the EU (Hetzner is cheaper and more stable). A per-tenant choice is possible.
6. **Backend language:** TypeScript (NestJS) for the API + Python for ML (default) or everything in Python.
7. **Project status:** a course/thesis project, a startup, a grant? This affects the depth of the legal part and whether to do Diia at all (a legal entity is required).
8. **What to start building first**, if you approve the plan: the technical spike from Phase 0 (a gaze prototype in the browser + a chunked recorder) in this repository.

---

## 13. Sources
- Bill 8153: [card on rada.gov.ua](https://itd.rada.gov.ua/billinfo/Bills/Card/40707), [Ukrinform on the changes](https://www.ukrinform.ua/rubric-polytics/3826649-obovazkove-informuvanna-kontrol-ta-veliki-strafi-ak-novij-zakonoproekt-zminue-pravila-zahistu-personalnih-danih.html), [BRDO summary of the discussion](https://brdo.com.ua/news/personalni-dani-ta-vidkrytist-superechnosti-chy-kompromis-pidsumky-obgovorennya-zakonoproyektu-8153/), [GDPR in Ukraine in 2026](https://glavnoe.in.ua/news/gdpr-v-ukrayini-u-2026-chy-hotovyj-vash-biznes-do-perevirky)
- Diia integration: [Document sharing](https://integration.diia.gov.ua/sharing.html), [Diia.Signature](https://integration.diia.gov.ua/signature.html), [Validation](https://integration.diia.gov.ua/validation.html), [API overview on DOU](https://dou.ua/forums/topic/50684/)
- Gaze in the browser: [KPI, efficient real-time gaze tracking for browser](https://ela.kpi.ua/items/005845e3-9b1d-47a7-ad3d-16dda79e6c89), [arXiv 2601.06279 (landmark-based calibrated browser gaze)](https://arxiv.org/abs/2601.06279v1), [Webcam CNN gaze, Herts](https://uhra.herts.ac.uk/id/eprint/11776/)
- Detecting violations by pose/gaze: [Manipal, head pose + gaze](https://online-journals.org/index.php/i-jet/article/view/15995), [THE on ASU 75.6%](https://timeshighereducation.com/news/all-head-online-cheats-exposed-face-tilts), [dataset of suspicious behavior](https://data.mendeley.com/datasets/39xs8th543)
- Legal precedents: [Ogletree v. Cleveland State, Higher Ed Dive](https://www.highereddive.com/news/test-proctoring-room-scans-violated-college-students-privacy-judge-rules/630340/), [EFF](https://www.eff.org/node/107125), [case analysis](https://usfblogs.usfca.edu/iptlj/files/2023/12/8.-CASSULO-FINAL-Ogletree-v.-Cleveland-State-Univ.pdf)
- Moodle in Ukrainian universities: [VNU](https://moodle.vnu.edu.ua/), [ChNU](https://moodle.chnu.edu.ua/), [distance learning centers](https://vnz.org.ua/dystantsijna-osvita/tsentry-do)
