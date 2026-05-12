"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { createBrowserClient } from "@supabase/ssr";

export function PostHogProvider() {
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    if (!token) return;

    posthog.init(token, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
      defaults: "2026-01-30",
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("identified") !== "1") return;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    const supabase = createBrowserClient(url, key);
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      posthog.identify(user.id, {
        email: user.email ?? undefined,
        name: user.user_metadata?.full_name as string | undefined,
      });
      params.delete("identified");
      const qs = params.toString();
      const next =
        window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
      window.history.replaceState(null, "", next);
    });
  }, []);

  return null;
}
