import { randomBytes, createHash, createCipheriv, createDecipheriv, timingSafeEqual } from 'node:crypto';
export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
export const randomToken = () => randomBytes(32).toString('base64url');
export const hash = value => createHash('sha256').update(value).digest('hex');
export const fingerprint = value => hash(JSON.stringify(value));
export function equal(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function cipher(keyText) {
  const key = Buffer.from(keyText || '', 'base64');
  if (key.length !== 32) throw new HttpError(503, 'Server encryption is not configured.');
  return {
    seal(value, context) {
      const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', key, iv);
      c.setAAD(Buffer.from(context));
      const encrypted = Buffer.concat([c.update(JSON.stringify(value)), c.final()]);
      return [iv, c.getAuthTag(), encrypted].map(x => x.toString('base64url')).join('.');
    },
    open(value, context) {
      const [iv, tag, data] = value.split('.').map(x => Buffer.from(x, 'base64url'));
      const c = createDecipheriv('aes-256-gcm', key, iv);
      c.setAAD(Buffer.from(context)); c.setAuthTag(tag);
      return JSON.parse(Buffer.concat([c.update(data), c.final()]).toString());
    }
  };
}
export function text(value, label, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new HttpError(400, `Invalid ${label}.`);
  return value.trim();
}
export function id(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new HttpError(400, 'Invalid reference.');
  return value;
}
export function tokenHash(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value)) throw new HttpError(404, 'Room not found.');
  return hash(value);
}
export function cookies(header = '') {
  return Object.fromEntries(header.split(';').map(v => v.trim().split('=')).filter(x => x.length === 2));
}
export function cookie(name, value, maxAge) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
export function requireOrigin(headers, origin) {
  if (headers.origin !== origin) throw new HttpError(403, 'This request must come from Receipts.');
}
