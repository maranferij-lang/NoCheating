#!/usr/bin/env node
/**
 * Copies/downloads the ML assets the browser needs into apps/web/public so the app works
 * fully offline-from-CDN (no runtime requests to Google/jsDelivr):
 *  - MediaPipe WASM runtime  → apps/web/public/mediapipe/wasm/
 *  - FaceLandmarker + ObjectDetector models → apps/web/public/models/
 *  - face-api models (tiny face detector, 68 landmarks, recognition) → apps/web/public/models/faceapi/
 * Safe to re-run. Never fails `npm install` — prints a clear warning instead.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(root, 'apps/web/public');
const require = createRequire(path.join(root, 'apps/web/package.json'));

const MODELS = [
  {
    file: 'face_landmarker.task',
    url: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  },
  {
    file: 'efficientdet_lite0.tflite',
    url: 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite',
  },
];
const FACEAPI_FILES = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model.bin',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model.bin',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model.bin',
];

let problems = 0;
const log = (m) => console.log(`[setup-assets] ${m}`);

function pkgDir(name) {
  try {
    return path.dirname(require.resolve(`${name}/package.json`));
  } catch {
    // some packages don't export package.json — walk up from the main entry
    try {
      let d = path.dirname(require.resolve(name));
      while (d !== path.dirname(d)) {
        if (fs.existsSync(path.join(d, 'package.json')) && JSON.parse(fs.readFileSync(path.join(d, 'package.json'), 'utf8')).name === name) return d;
        d = path.dirname(d);
      }
    } catch {}
    return null;
  }
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f);
    const d = path.join(dst, f);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

// 1. MediaPipe wasm
const mp = pkgDir('@mediapipe/tasks-vision');
if (mp && fs.existsSync(path.join(mp, 'wasm'))) {
  copyDir(path.join(mp, 'wasm'), path.join(pub, 'mediapipe/wasm'));
  log('MediaPipe WASM → public/mediapipe/wasm');
} else {
  problems++;
  log('WARN: @mediapipe/tasks-vision not installed yet (run npm install).');
}

// 2. face-api models
const fa = pkgDir('@vladmandic/face-api');
const faDst = path.join(pub, 'models/faceapi');
fs.mkdirSync(faDst, { recursive: true });
for (const f of FACEAPI_FILES) {
  const dst = path.join(faDst, f);
  if (fs.existsSync(dst) && fs.statSync(dst).size > 0) continue;
  const local = fa ? path.join(fa, 'model', f) : null;
  if (local && fs.existsSync(local)) {
    fs.copyFileSync(local, dst);
  } else {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/vladmandic/face-api/master/model/${f}`);
      if (!res.ok) throw new Error(String(res.status));
      fs.writeFileSync(dst, Buffer.from(await res.arrayBuffer()));
    } catch (e) {
      problems++;
      log(`WARN: could not get face-api model ${f}: ${e.message}`);
    }
  }
}
log('face-api models → public/models/faceapi');

// 3. MediaPipe models
for (const m of MODELS) {
  const dst = path.join(pub, 'models', m.file);
  if (fs.existsSync(dst) && fs.statSync(dst).size > 100_000) continue;
  try {
    log(`downloading ${m.file} …`);
    const res = await fetch(m.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    fs.writeFileSync(dst, Buffer.from(await res.arrayBuffer()));
  } catch (e) {
    problems++;
    log(`WARN: could not download ${m.file}: ${e.message}`);
  }
}

if (problems) {
  log(`Finished with ${problems} problem(s). Re-run: node scripts/setup-assets.mjs`);
} else {
  log('All ML assets ready.');
}
