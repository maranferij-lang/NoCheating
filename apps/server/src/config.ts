import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, '../../..');

export const config = {
  port: Number(process.env.PORT ?? (process.env.NODE_ENV === 'production' ? 3000 : 3001)),
  host: process.env.HOST ?? '0.0.0.0',
  /** SQLite DB + media live here. */
  dataDir: path.resolve(process.env.DATA_DIR ?? path.join(REPO_ROOT, 'data')),
  /** Demo proctor PIN (prototype auth). */
  proctorPin: process.env.PROCTOR_PIN ?? '1234',
  /** Public base URL used in phone pairing QR codes; when empty, derived from the request. */
  publicUrl: process.env.PUBLIC_URL ?? '',
  /** Built web app served in production. */
  webDist: path.join(REPO_ROOT, 'apps/web/dist'),
  isProd: process.env.NODE_ENV === 'production',
  /** Max upload size for one media segment (bytes). */
  maxSegmentBytes: 25 * 1024 * 1024,
};
