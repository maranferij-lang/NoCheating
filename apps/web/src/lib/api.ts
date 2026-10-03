/**
 * Typed HTTP client — THE CONTRACT between apps/web and apps/server.
 * The server must implement every route below with exactly these paths, methods and payloads.
 *
 * Auth
 * - Proctor routes: header `Authorization: Bearer <proctorToken>`; for <img>/<video> URLs the
 *   token is appended as `?token=` (see `withToken`).
 * - Student routes (/api/student/*): header `Authorization: Bearer <studentToken>`; the token
 *   identifies the session.
 * - Phone routes (/api/phone/:pairToken/*): the pair token in the path is the credential.
 * Errors: non-2xx → JSON `{ error: string (Ukrainian, user-presentable), code?: string }`.
 */
import type {
  CalibrationSummary,
  ClientEvent,
  ConsentRecord,
  DeviceInfo,
  Exam,
  ExamPolicy,
  ExamSummary,
  IdentityResult,
  MediaSegment,
  MediaStreamKind,
  ProctorEvent,
  ProctorMessage,
  PublicExam,
  Question,
  Review,
  ReviewDecision,
  Session,
  SessionDetail,
  SessionListItem,
  StudentSessionView,
  TelemetryBatch,
  TelemetryResponse,
} from '@nocheating/core';
import { auth } from './auth';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

type Who = 'proctor' | 'student' | 'none';

async function request<T>(method: string, path: string, opts: { who?: Who; body?: unknown; raw?: Blob; headers?: Record<string, string>; signal?: AbortSignal } = {}): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  const who = opts.who ?? 'none';
  const token = who === 'proctor' ? auth.proctor()?.token : who === 'student' ? auth.student()?.token : undefined;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (opts.raw) {
    body = opts.raw;
    if (!headers['Content-Type']) headers['Content-Type'] = opts.raw.type || 'application/octet-stream';
  } else if (opts.body !== undefined) {
    body = JSON.stringify(opts.body);
    headers['Content-Type'] = 'application/json';
  }
  let res: Response;
  try {
    res = await fetch(path, { method, headers, body, signal: opts.signal });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError('Немає зʼєднання з сервером', 0, 'network');
  }
  if (!res.ok) {
    let msg = `Помилка сервера (${res.status})`;
    let code: string | undefined;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
      code = j?.code;
    } catch {
      /* not json */
    }
    throw new ApiError(msg, res.status, code);
  }
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get('content-type') ?? '';
  return (ct.includes('application/json') ? res.json() : res.text()) as Promise<T>;
}

/** Append proctor token for media URLs used in <img>/<video>. */
export function withToken(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const t = auth.proctor()?.token;
  if (!t) return url;
  return url + (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(t);
}

export interface ExamInput {
  title: string;
  description: string;
  durationMin: number;
  status: Exam['status'];
  policy: ExamPolicy;
  questions: Question[];
}

export const api = {
  health: () => request<{ ok: boolean; version: string; time: string }>('GET', '/api/health'),

  // ---- proctor auth
  proctorLogin: (pin: string, name: string) => request<{ token: string; name: string }>('POST', '/api/auth/proctor', { body: { pin, name } }),
  proctorMe: () => request<{ name: string }>('GET', '/api/auth/me', { who: 'proctor' }),

  // ---- exams (proctor)
  listExams: () => request<ExamSummary[]>('GET', '/api/exams', { who: 'proctor' }),
  createExam: (input: ExamInput) => request<Exam>('POST', '/api/exams', { who: 'proctor', body: input }),
  getExam: (id: string) => request<Exam>('GET', `/api/exams/${id}`, { who: 'proctor' }),
  updateExam: (id: string, input: ExamInput) => request<Exam>('PUT', `/api/exams/${id}`, { who: 'proctor', body: input }),
  deleteExam: (id: string) => request<{ ok: true }>('DELETE', `/api/exams/${id}`, { who: 'proctor' }),
  listSessions: (examId: string) => request<SessionListItem[]>('GET', `/api/exams/${examId}/sessions`, { who: 'proctor' }),
  /** CSV export URL (open in new tab). */
  examCsvUrl: (examId: string) => withToken(`/api/exams/${examId}/export.csv`)!,
  seedDemo: () => request<{ examId: string; created: boolean }>('POST', '/api/demo/seed', { who: 'proctor' }),

  // ---- sessions (proctor)
  getSession: (id: string) => request<SessionDetail>('GET', `/api/sessions/${id}`, { who: 'proctor' }),
  reviewSession: (id: string, decision: ReviewDecision, comment: string) => request<Session>('POST', `/api/sessions/${id}/review`, { who: 'proctor', body: { decision, comment } }),
  labelEvent: (sessionId: string, eventId: string, label: ProctorEvent['label']) => request<{ event: ProctorEvent; session: Session }>('POST', `/api/sessions/${sessionId}/events/${eventId}/label`, { who: 'proctor', body: { label } }),
  sendMessage: (sessionId: string, text: string) => request<ProctorMessage>('POST', `/api/sessions/${sessionId}/messages`, { who: 'proctor', body: { text } }),
  forceSubmit: (sessionId: string) => request<{ ok: true }>('POST', `/api/sessions/${sessionId}/force-submit`, { who: 'proctor' }),
  deleteSession: (sessionId: string) => request<{ ok: true }>('DELETE', `/api/sessions/${sessionId}`, { who: 'proctor' }),
  /** Latest live snapshot URL (JPEG) for a stream. */
  latestSnapshotUrl: (sessionId: string, stream: 'webcam' | 'phone' | 'screen' = 'webcam') => withToken(`/api/sessions/${sessionId}/snapshot/latest?stream=${stream}`)!,

  // ---- student
  getJoin: (code: string) => request<PublicExam>('GET', `/api/join/${encodeURIComponent(code.trim().toUpperCase())}`),
  createSession: (code: string, studentName: string, studentNumber: string) => request<{ sessionId: string; token: string }>('POST', '/api/sessions', { body: { code: code.trim().toUpperCase(), studentName, studentNumber } }),
  studentView: () => request<StudentSessionView>('GET', '/api/student/session', { who: 'student' }),
  submitConsent: (c: ConsentRecord) => request<Session>('POST', '/api/student/consent', { who: 'student', body: c }),
  submitDevice: (d: DeviceInfo) => request<Session>('POST', '/api/student/device', { who: 'student', body: d }),
  uploadIdentityImage: (kind: 'selfie' | 'idcard', jpeg: Blob) => request<{ ok: true }>('POST', `/api/student/identity/${kind}`, { who: 'student', raw: jpeg, headers: { 'Content-Type': 'image/jpeg' } }),
  submitIdentity: (r: IdentityResult) => request<Session>('POST', '/api/student/identity', { who: 'student', body: r }),
  submitCalibration: (c: CalibrationSummary) => request<Session>('POST', '/api/student/calibration', { who: 'student', body: c }),
  startExam: () => request<StudentSessionView>('POST', '/api/student/start', { who: 'student' }),
  sendTelemetry: (b: TelemetryBatch) => request<TelemetryResponse>('POST', '/api/student/telemetry', { who: 'student', body: b }),
  uploadSegment: (stream: MediaStreamKind, seq: number, blob: Blob, meta: { tStart: number; tEnd: number; sha256: string }) =>
    request<MediaSegment>('POST', `/api/student/media/${stream}/${seq}`, {
      who: 'student',
      raw: blob,
      headers: { 'Content-Type': blob.type || 'video/webm', 'X-T-Start': String(meta.tStart), 'X-T-End': String(meta.tEnd), 'X-Sha256': meta.sha256 },
    }),
  uploadSnapshot: (stream: 'webcam' | 'screen', jpeg: Blob) => request<{ ok: true }>('POST', `/api/student/snapshot?stream=${stream}`, { who: 'student', raw: jpeg, headers: { 'Content-Type': 'image/jpeg' } }),
  saveAnswers: (answers: Record<string, number[] | string>) => request<{ ok: true }>('POST', '/api/student/answers', { who: 'student', body: { answers } }),
  pause: (reason: 'air_raid' | 'blackout' | 'other', note?: string) => request<StudentSessionView>('POST', '/api/student/pause', { who: 'student', body: { reason, note } }),
  resume: () => request<StudentSessionView>('POST', '/api/student/resume', { who: 'student' }),
  submitExam: (answers: Record<string, number[] | string>) => request<{ ok: true; submittedAt: string }>('POST', '/api/student/submit', { who: 'student', body: { answers } }),
  phonePair: () => request<{ pairToken: string; url: string }>('POST', '/api/student/phone-pair', { who: 'student' }),

  // ---- phone companion
  phoneInfo: (pairToken: string) => request<{ sessionId: string; studentName: string; examTitle: string; status: Session['status'] }>('GET', `/api/phone/${pairToken}`),
  phoneHello: (pairToken: string, device: { userAgent: string; cameraLabel: string }) => request<{ ok: true }>('POST', `/api/phone/${pairToken}/hello`, { body: device }),
  phoneSegment: (pairToken: string, seq: number, blob: Blob, meta: { tStart: number; tEnd: number; sha256: string }) =>
    request<MediaSegment>('POST', `/api/phone/${pairToken}/media/${seq}`, {
      raw: blob,
      headers: { 'Content-Type': blob.type || 'video/webm', 'X-T-Start': String(meta.tStart), 'X-T-End': String(meta.tEnd), 'X-Sha256': meta.sha256 },
    }),
  phoneSnapshot: (pairToken: string, jpeg: Blob) => request<{ ok: true }>('POST', `/api/phone/${pairToken}/snapshot`, { raw: jpeg, headers: { 'Content-Type': 'image/jpeg' } }),
  phoneTelemetry: (pairToken: string, events: ClientEvent[]) => request<{ ok: true; sessionStatus: Session['status']; startedAt: string | null }>('POST', `/api/phone/${pairToken}/telemetry`, { body: { events } }),
  phoneBye: (pairToken: string) => request<{ ok: true }>('POST', `/api/phone/${pairToken}/bye`),
};

/** WebSocket URL for proctor live updates (LiveMessage JSON frames). */
export function liveSocketUrl(examId?: string): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const t = encodeURIComponent(auth.proctor()?.token ?? '');
  return `${proto}://${location.host}/api/live?token=${t}${examId ? `&examId=${encodeURIComponent(examId)}` : ''}`;
}

export type { Review };
