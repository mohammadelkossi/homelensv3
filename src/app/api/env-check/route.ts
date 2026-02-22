import { NextResponse } from 'next/server';

/**
 * Dev-only: reports which env vars are set (no values).
 * Only works when NODE_ENV=development. Remove or disable in production.
 */
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }
  const vars = {
    APIFY_API_TOKEN: !!process.env.APIFY_API_TOKEN,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  const missing = Object.entries(vars).filter(([, v]) => !v).map(([k]) => k);
  return NextResponse.json({ vars, missing, ok: missing.length === 0 });
}
