import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import {
  hasFreeReportLimitReached,
  reportLimitReachedMessage,
  isProProfile,
} from '@/lib/report-generation';
import { generatePropertyReport, ReportGenerationError } from '@/lib/property-report';

export const maxDuration = 60;

// The report itself is built in src/lib/property-report.ts (shared with the
// Claude/ChatGPT connector). This route is the website's wrapper around it: sign-in,
// the report allowance, and saving the result.

export async function POST(request: NextRequest) {
  const requestStartedAt = Date.now();
  try {
    const body = await request.json();
    const { url, postcode } = body;
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    // Auth
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Limit check
    const missingSupabase = [
      !process.env.NEXT_PUBLIC_SUPABASE_URL && 'NEXT_PUBLIC_SUPABASE_URL',
      !process.env.SUPABASE_SERVICE_ROLE_KEY && 'SUPABASE_SERVICE_ROLE_KEY',
    ].filter(Boolean) as string[];
    if (missingSupabase.length > 0) {
      return NextResponse.json({ error: `Server configuration error: missing ${missingSupabase.join(', ')}` }, { status: 500 });
    }

    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('plan, property_reports_used, stripe_subscription_id, stripe_status')
      .eq('id', user.id)
      .maybeSingle();

    if (hasFreeReportLimitReached(profile, user.created_at)) {
      return NextResponse.json(
        { error: 'limit_reached', message: reportLimitReachedMessage() },
        { status: 403 }
      );
    }

    const result = await generatePropertyReport({ url, postcode, startedAt: requestStartedAt, budgetSecs: 60 });

    // Increment usage counter for non-Pro users with a report allowance
    if (!isProProfile(profile)) {
      const used = profile?.property_reports_used ?? 0;
      const newCount = used + 1;
      if (profile) {
        await supabaseAdmin.from('profiles').update({ property_reports_used: newCount }).eq('id', user.id);
      } else {
        await supabaseAdmin.from('profiles').insert({ id: user.id, plan: 'free', property_reports_used: 1 });
      }
    }

    // Persist the report (report_version 2 = the redesigned layout). Best-effort: a save
    // failure must never break report generation for the user.
    let savedReportId: number | null = null;
    try {
      const { data: savedReport, error: saveError } = await supabaseAdmin
        .from('saved_reports')
        .insert({ user_id: user.id, property_url: url || null, report_data: result, report_version: 2 })
        .select('id')
        .single();
      if (saveError) {
        console.error('Failed to save report:', saveError);
      } else {
        savedReportId = savedReport?.id ?? null;
      }
    } catch (error) {
      console.error('Failed to save report:', error);
    }

    return NextResponse.json({ ...result, savedReportId });
  } catch (error: any) {
    if (error instanceof ReportGenerationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error scraping property:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scrape property', details: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    );
  }
}
