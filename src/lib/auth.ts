import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'robot-games-tournament-admin-secret-key-32-chars-minimum'
);

const COOKIE_NAME = 'rg_admin_session';

export async function verifyAdminPassword(inputPassword: string): Promise<boolean> {
  if (!inputPassword || typeof inputPassword !== 'string') return false;

  // Primary: Plain password from environment (ADMIN_PASSWORD or ADMIN_PASSKEY)
  const configuredPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSKEY;
  if (configuredPassword) {
    return inputPassword.trim() === configuredPassword.trim();
  }

  // Optional legacy fallback if ADMIN_PASSKEY_HASH was set
  const configuredHash = process.env.ADMIN_PASSKEY_HASH;
  if (configuredHash) {
    const normalizedHash = configuredHash.replace(/\\/g, '');
    return bcrypt.compare(inputPassword, normalizedHash);
  }

  return false;
}

export const verifyAdminPasskey = verifyAdminPassword;

export async function createAdminToken(username: string): Promise<string> {
  return await new SignJWT({ username, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

export async function verifyAdminToken(token: string): Promise<{ username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.username && payload.role === 'admin') {
      return { username: String(payload.username) };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<{ username: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
