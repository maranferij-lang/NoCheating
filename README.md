# NoCheating: Honest Online Exams

A prototype online proctoring system for Ukrainian universities. It runs in a regular browser with
nothing to install and helps an instructor supervise a remote exam. The system does not issue
verdicts: it collects evidence and explains what happened, and a human makes the decision.

> **Status: demo prototype.** Do not use it for real exams without the improvements described in
> the ["Weaknesses"](docs/LIMITATIONS.md) section.

## What the prototype does

**For the student**
- Joining an exam with a code, and a clear consent screen listing what is recorded and what the
  system does not do.
- Device check: camera, lighting, performance, number of monitors, network, virtual cameras.
- Identity confirmation: a liveness check (head turn, blinking) and a comparison of the face with the
  photo on a student card or ID card.
- 9-point gaze calibration.
- Phone as a second camera via a QR code (optional).
- An exam with a timer, autosave and a pause button for air raid alerts or power outages.
- The recording is not lost when the internet drops: it is kept in the browser and uploaded later.

**For the instructor**
- Creating an exam with a configurable strictness policy.
- A list of students sorted by suspicion level, with an explanation of each score.
- Live view: camera snapshots and an event feed.
- Session review: video, event timeline, gaze heatmap, photo comparison, messages to the student.
- "Confirmed" and "false positive" labels, decisions, and a printable protocol with SHA-256 hashes.

**For the demo**
- The "Lab" page (UI name "Лабораторія") shows live what the system sees: the face mesh, head
  rotation, the gaze point, objects in frame and the risk score.
- A demo exam with synthetic sessions of different scenarios, so the instructor dashboard is not
  empty.

## How the analysis works

Video analysis happens **in the student's browser** (MediaPipe and face-api). The server receives
events, compact measurements (about 5 per second) and compressed video in 10-second chunks. The
server recomputes the events from the measurements, clusters off-screen gazes (DBSCAN) and computes
an explainable risk score.
Details are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), and the product plan is in
[docs/PLAN.md](docs/PLAN.md).

## Quick start

Requires: **Node.js 22+** and **Chrome or Edge**.

```bash
npm install        # also downloads the MediaPipe models (~8 MB)
npm run dev        # server :3001 + web app :5173
```

Open http://localhost:5173.

| What | How |
|---|---|
| Instructor dashboard | http://localhost:5173/proctor, PIN **1234** |
| Trial exam (10 min) | code **TEST10** at http://localhost:5173/join |
| Demo exam with synthetic sessions | code **DEMO26** (in the instructor dashboard) |
| Lab | http://localhost:5173/lab |

Demo data is created automatically on first start. To create it again: `npm run seed`.

### Production mode (single port)

```bash
npm run build
npm start          # http://localhost:3000
```

### Docker

```bash
docker compose up --build    # http://localhost:3000
```

Environment variables: `PORT`, `DATA_DIR` (database and recordings), `PROCTOR_PIN`, `PUBLIC_URL` (the
address used in the phone QR code), `SEED_ON_EMPTY=0` (do not create demo data).

## Phone as a second camera

The browser gives access to the camera only on `https://` or `localhost`. So the phone needs an
HTTPS address:

- **Simplest:** a free Cloudflare tunnel. Run `npm run build && npm start`, then
  `npx cloudflared tunnel --url http://localhost:3000` and open the issued address
  `https://….trycloudflare.com` on both the laptop and the phone.
- **On the local network:** `npm run dev:https`, open `https://<laptop-IP>:5173` and accept the
  self-signed certificate warning.
- **On a hosting service:** the Docker image on any service with HTTPS and a persistent disk.

## Tests

```bash
npm run typecheck
npm test               # unit tests for the core and the server
npm run fixtures       # creates fake videos for the camera (requires ffmpeg)
npm run build && npm run test:e2e   # end-to-end tests in Chromium with a fake camera
```

## Structure

```
packages/core   shared types, gaze analysis, clustering, risk score, scenario simulator
apps/server     Fastify + SQLite: API, media, WebSocket, demo data
apps/web        React: student, phone, instructor dashboard, lab
docs/           product plan, architecture, demo script, weaknesses
e2e/            Playwright end-to-end tests
```

## Documents

- [docs/DEMO.md](docs/DEMO.md): how to show the prototype in 10 minutes.
- [docs/LIMITATIONS.md](docs/LIMITATIONS.md): weaknesses and how to fix them.
- [docs/PLAN.md](docs/PLAN.md): the detailed product plan.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): the technical architecture.

## Privacy

Audio is not recorded (only speech detection, if enabled). Emotions are not recognized. The room is
not scanned. Recordings without violations are deleted after the retention period. A student's data
can be deleted from the instructor dashboard.
