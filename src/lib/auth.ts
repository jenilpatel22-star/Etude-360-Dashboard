/**
 * Password hashing with PBKDF2-SHA256 (Web Crypto). Hashes and salts are stored
 * base64-encoded on the account; plaintext passwords are never stored.
 */
export const PBKDF2_ITERATIONS = 210_000;

const toB64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export function newSalt(): string {
  return toB64(crypto.getRandomValues(new Uint8Array(16)));
}

export async function hashPassword(password: string, salt: string, iterations = PBKDF2_ITERATIONS): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(salt), iterations }, key, 256);
  return toB64(bits);
}

/** Length-constant comparison so timing doesn't reveal how much of a hash matched. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createCredentials(password: string) {
  const salt = newSalt();
  return { salt, iterations: PBKDF2_ITERATIONS, passwordHash: await hashPassword(password, salt) };
}

export async function verifyPassword(password: string, account: { passwordHash: string; salt: string; iterations: number }) {
  return safeEqual(await hashPassword(password, account.salt, account.iterations), account.passwordHash);
}

/** Returns an error message, or undefined when the password meets the policy. */
export function passwordProblem(pw: string): string | undefined {
  if (pw.length < 8) return 'Use at least 8 characters';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Include at least one letter and one number';
  return undefined;
}

export const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;
export const normaliseUsername = (u: string) => u.trim().toLowerCase();
