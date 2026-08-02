import crypto from 'node:crypto';
import { getSettings } from './db.ts';

const SALT = 'andeaha-hizaha-salt';

// Stockage en mémoire du processus pour les jetons valides.
// Déplacé ici (lib partagée) pour garantir une instance unique entre toutes les routes API.
const validTokens = new Set<string>();

export function hashPassword(pw: string): string {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

export function verifyPassword(pw: string): boolean {
  const stored = getSettings().admin_password;
  if (!stored) return false;
  return crypto.timingSafeEqual(Buffer.from(hashPassword(pw)), Buffer.from(stored));
}

export function makeToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(SALT + token).digest('hex');
}

export function issueToken(): string {
  const token = makeToken();
  validTokens.add(token);
  return token;
}


export function isValidToken(token: string): boolean {
  return validTokens.has(token);
}

export function isAdminRequest(authHeader: string | null): boolean {
  if (!authHeader?.startsWith('Bearer ')) return false;
  return isValidToken(authHeader.slice(7));
}
