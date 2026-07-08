import { NextResponse } from 'next/server';

/**
 * Dev-only: reports which env vars are set (no values).
 * Only works when NODE_ENV=development. Remove or disable in production.
 */
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }
  const hasEpcBearer = !!process.env.EPC_API_BEARER_TOKEN;
  const hasLegacyEpc = !!process.env.EPC_API_EMAIL && !!process.env.EPC_API_KEY;
  const epcAuthConfigured = hasEpcBearer || hasLegacyEpc;

  const vars = {
    APIFY_API_TOKEN: !!process.env.APIFY_API_TOKEN,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    HOMEDATA_API_KEY: !!process.env.HOMEDATA_API_KEY,
    EPC_API_BEARER_TOKEN: hasEpcBearer,
    EPC_API_EMAIL: !!process.env.EPC_API_EMAIL,
    EPC_API_KEY: !!process.env.EPC_API_KEY,
    EPC_AUTH_CONFIGURED: epcAuthConfigured,
  };

  const missing = Object.entries(vars)
    .filter(([k, v]) => !v && k !== 'EPC_API_EMAIL' && k !== 'EPC_API_KEY')
    .map(([k]) => k);

  if (!epcAuthConfigured) {
    missing.push('EPC_API_BEARER_TOKEN (or EPC_API_EMAIL + EPC_API_KEY)');
  }

  return NextResponse.json({ vars, missing, ok: missing.length === 0 });
}
