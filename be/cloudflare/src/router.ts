import { SERVICE_REGISTRY, validateOrigin } from './config';
import type { Env } from './config';

export type Resolved = { status: number } | { url: URL; origin: URL; key: string };

const BAD_RAW = /%(2e|2f|5c|00|25)|\\/i;
const CTRL = /[\x00-\x1f\x7f]/;
const BAD_SEG = (s: string) => s === '' || s === '.' || s === '..' || /[\/\\%]/.test(s) || CTRL.test(s);

export function resolve(req: Request, env: Env): Resolved {
  const raw = /^https?:\/\/[^/]+(\/[^?#]*)?/i.exec(req.url)?.[1] ?? '/';
  if (BAD_RAW.test(raw) || CTRL.test(raw) || raw.split('/').some((s) => s === '.' || s === '..')) return { status: 400 };
  let segs: string[];
  try {
    segs = raw.slice(1).split('/').map((p) => decodeURIComponent(p));
  } catch {
    return { status: 400 };
  }
  if (segs.some(BAD_SEG)) return { status: 400 };
  const [key, ...rest] = segs;
  if (!Object.prototype.hasOwnProperty.call(SERVICE_REGISTRY, key)) return { status: 404 };
  const svc = SERVICE_REGISTRY[key];
  if (!svc.methods.includes(req.method)) return { status: 405 };
  const path = '/' + rest.join('/');
  if (!svc.prefixes.some((p) => path === p || path.startsWith(p + '/'))) return { status: 404 };
  const origin = validateOrigin(env[svc.binding]);
  if (!origin) return { status: 503 };
  const url = new URL(origin.origin + path.split('/').map(encodeURIComponent).join('/') + new URL(req.url).search);
  return { url, origin, key };
}
