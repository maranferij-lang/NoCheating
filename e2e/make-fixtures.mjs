#!/usr/bin/env node
/**
 * Builds fake-webcam videos (Y4M) for Chromium's --use-file-for-fake-video-capture.
 * Source: MediaPipe's public test image (downloaded, not committed).
 *   face.y4m      — one face, gentle motion (20 s)
 *   twofaces.y4m  — two faces (10 s)
 *   noface.y4m    — empty background (10 s)
 *   scenario.y4m  — 10 s face → 6 s no face → 6 s two faces → 10 s face
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
fs.mkdirSync(dir, { recursive: true });
const src = path.join(dir, 'portrait.jpg');
if (!fs.existsSync(src)) {
  const res = await fetch('https://storage.googleapis.com/mediapipe-assets/portrait.jpg');
  fs.writeFileSync(src, Buffer.from(await res.arrayBuffer()));
}
const ff = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });
const out = (n) => path.join(dir, n);
const FPS = 15;

// head & shoulders crop (420x420 around the face), placed on a 640x360 canvas with gentle motion
const face = `[0:v]crop=460:460:180:0,scale=330:330[f];color=c=0x8a6f5a:s=640x360:r=${FPS}[bg];[bg][f]overlay=x='155+12*sin(t*0.9)':y='15+6*sin(t*0.7)':shortest=1,format=yuv420p`;
ff(['-loop', '1', '-r', String(FPS), '-i', src, '-filter_complex', face, '-t', '20', out('face.y4m')]);

const two = `[0:v]crop=460:460:180:0,scale=250:250,split[a][b];color=c=0x8a6f5a:s=640x360:r=${FPS}[bg];[bg][a]overlay=x=40:y=60[t];[t][b]overlay=x=350:y=60:shortest=1,format=yuv420p`;
ff(['-loop', '1', '-r', String(FPS), '-i', src, '-filter_complex', two, '-t', '10', out('twofaces.y4m')]);

const none = `[0:v]crop=180:300:0:0,scale=640:360,format=yuv420p`;
ff(['-loop', '1', '-r', String(FPS), '-i', src, '-vf', none.replace('[0:v]', ''), '-t', '10', out('noface.y4m')]);

// scenario = concat
const list = out('concat.txt');
fs.writeFileSync(list, ['face.y4m', 'noface.y4m', 'twofaces.y4m', 'face.y4m'].map((f) => `file '${out(f)}'`).join('\n'));
ff(['-f', 'concat', '-safe', '0', '-i', list, '-vf', `trim=0:32,setpts=PTS-STARTPTS,fps=${FPS},format=yuv420p`, out('scenario.y4m')]);
fs.unlinkSync(list);
for (const f of ['face.y4m', 'twofaces.y4m', 'noface.y4m', 'scenario.y4m']) console.log(f, (fs.statSync(out(f)).size / 1e6).toFixed(1), 'MB');
