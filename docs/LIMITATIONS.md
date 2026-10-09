# Weaknesses of the prototype and how to fix them

This document exists so that questions during a demo can be answered honestly. The prototype shows
that the idea is technically feasible in a regular browser with nothing to install. It is not a
finished product for real exams.

## Short answer: is this a working idea?

**Yes, as a deterrence and evidence-gathering tool for a human.** The student knows that recording is
on and that repeated glances at one spot, a phone in frame or a second person will be shown to the
instructor. Instead of 90 minutes of video per student, the instructor gets a list of suspicious
moments with clips.

**No, as an automatic cheating detector.** A webcam does not see everything, gaze is measured with
an error margin, and a clever violator will always find a blind spot. That is why the system never
issues a verdict and the decision always belongs to a human. The best result comes from combining
proctoring with sound assignment design: question randomization, time limits, and an oral interview
when there is suspicion.

## Technical limitations

| Problem | Why it matters | How to fix it in the product |
|---|---|---|
| **The client cannot be fully trusted.** Analysis runs in the student's browser, so a technically skilled student can replace the code or the camera. | Events can be forged or hidden. | The server re-analyzes random frames from the video (sampling audit). Telemetry is checked against the recording. A second camera from a phone. Random "live" checks during the exam. A Safe Exam Browser option for strict exams. |
| **Virtual cameras and prerecorded video.** | A "clean" video can be shown instead of a live one. | A heuristic based on the device name already exists. Next: random challenges (turn your head, show your fingers), artifact analysis on the server, a second camera. |
| **Webcam gaze accuracy is limited.** A few degrees at best; worse with glasses, poor lighting, cheap cameras. | It cannot tell "looking at the keyboard" from "looking at a phone next to the keyboard". | Gaze is only one of the signals. Personal calibration, a fallback signal based on head turn, recalibration during the exam. Thresholds should be tuned on labeled pilot data. |
| **False positives.** Someone is thinking while looking at the ceiling. Someone is neurodivergent. Someone is in a shelter with their family. | Unfair suspicions and appeals. | A special-needs profile where gaze signals are not scored. Strictness presets. An explanation of every score. "False positive" labels from the instructor that lower the score and accumulate data for tuning. |
| **Browsers.** The Window Management API exists only in Chromium. Safari records video as MP4 and has restrictions on background camera use. Mobile browsers have no screen sharing. | Some checks do not work everywhere. | Official support for Chrome and Edge on desktop. The phone only as a second camera. An honest requirements page before the exam. |
| **Weak laptops.** On old Celerons the analysis runs at 2-5 frames per second. | Short events are missed. | Adaptive frame rate already exists. Next: server-side analysis for weak devices, lighter models, WebGPU. |
| **Long power outages and mobile internet.** | Part of the recording is lost. | The IndexedDB queue already survives reloads and network loss. Next: lower bitrate on a poor connection, warnings about storage quota. |
| **AI on a second device, an earpiece, smart glasses.** | The laptop camera does not see this. | A second camera at the side, sound detection, and above all assignment design: open questions, personalized variants, an oral interview. |
| **Identification by the photo on a student card.** The photo is small and old; the face-api model is not the most accurate and may perform worse for some groups. | False matches or mismatches. | Diia.Sharing after an agreement with the Ministry of Digital Transformation (Мінцифри). An ArcFace model on the server. Always a manual check if the match is doubtful. Testing on a diverse sample. |

## Security and scale (prototype vs product)

| In the prototype now | In the product |
|---|---|
| Instructor login by PIN | University SSO (Google Workspace / Microsoft 365), roles, two-factor authentication |
| SQLite and files on the disk of one server | PostgreSQL, object storage (S3) with encryption, separate ML workers |
| HTTP on the local network | HTTPS only, HSTS, strict CSP |
| No external audit | Pentest, an access log for every recording, DPIA |
| A simple built-in test | Integration with Moodle (LTI 1.3 + a test access plugin) |

## Legal and organizational risks

- **Consent under unequal power.** The student depends on the university, so consent may be
  considered not freely given. The university must offer an alternative, for example an in-person
  exam. The prototype shows this option on the consent screen.
- **Biometric data.** The current Law "On Personal Data Protection" (2297-VI) and bill 8153 require a
  legal basis for processing, minimization and retention periods. A university regulation, notices
  to students and a DPIA are needed.
- **Students abroad.** GDPR may apply to students in the EU. Automated decisions without human
  involvement are prohibited by Article 22, so the instructor always makes the decision.
- **EU AI Act.** Systems for monitoring prohibited student behavior during tests are classified as
  high-risk (Annex III, point 3). Emotion recognition in education is prohibited (Article 5). The
  prototype does not recognize emotions. To enter the EU market it would need risk management,
  logging, human oversight and technical documentation.
- **Room scanning.** A US court ruled it a privacy violation (Ogletree v. Cleveland State, 2022). In
  the prototype it is off by default.

## What to check in a pilot

1. The share of false positives among honest students in real conditions.
2. Whether the instructor really spends less time reviewing a group.
3. How students perceive the system: a survey after the exam.
4. How many sessions lose their recording because of hardware or connectivity.
