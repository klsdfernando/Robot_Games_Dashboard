import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPasskey, createAdminToken, ADMIN_COOKIE_NAME } from '@/lib/auth';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = new Map<string, { count: number; resetAt: number }>();

function clientKey(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'local';
}

export async function POST(req: NextRequest) {
  try {
    const key = clientKey(req);
    const now = Date.now();
    const current = attempts.get(key);
    if (current && current.resetAt > now && current.count >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again in 15 minutes.' },
        { status: 429, headers: { 'Retry-After': '900' } }
      );
    }
    if (current && current.resetAt <= now) attempts.delete(key);

    const { passkey } = await req.json();

    if (typeof passkey !== 'string' || passkey.length < 6 || passkey.length > 128) {
      return NextResponse.json({ error: 'A valid organizer passkey is required' }, { status: 400 });
    }

    const isValid = await verifyAdminPasskey(passkey);
    if (!isValid) {
      const entry = attempts.get(key);
      attempts.set(key, {
        count: (entry?.resetAt && entry.resetAt > now ? entry.count : 0) + 1,
        resetAt: entry?.resetAt && entry.resetAt > now ? entry.resetAt : now + WINDOW_MS,
      });
      return NextResponse.json({ error: 'Invalid passkey' }, { status: 401 });
    }

    attempts.delete(key);
    const username = 'organizer';
    const token = await createAdminToken(username);

    const response = NextResponse.json({ success: true, user: { username } });
    response.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
