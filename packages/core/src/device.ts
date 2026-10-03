import { todo } from './todo';

/** OBS, ManyCam, Snap Camera, XSplit, DroidCam, Iriun, NVIDIA Broadcast, "Virtual", e2eSoft VCam, CamTwist, mmhmm, ... */
export function isSuspiciousCameraLabel(label: string): boolean {
  return todo('isSuspiciousCameraLabel');
}

/** WebGL renderer strings typical for VMs / software rendering: VMware, VirtualBox, llvmpipe, SwiftShader, Parallels, QEMU, Hyper-V... */
export function isVmRenderer(renderer: string | null): boolean {
  return todo('isVmRenderer');
}

/** Minimal UA parse: browser name+major version, OS, isMobile. */
export function parseUserAgent(ua: string): { browser: string; os: string; isMobile: boolean } {
  return todo('parseUserAgent');
}

/** Choose analysis rate from benchmark fps: ≥20 → 10 Hz, ≥10 → 6 Hz, ≥5 → 3 Hz, else 2 Hz. */
export function chooseAnalysisHz(benchmarkFps: number): number {
  return todo('chooseAnalysisHz');
}
