"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { createBrowserClient } from "@supabase/ssr";
import {
  OAUTH_SIGNUP_METADATA_STORAGE_KEY,
  readPendingOAuthSignupPayload,
  clearPendingOAuthSignupMetadata,
} from "@/lib/oauth-signup-metadata";

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    const supabase = createBrowserClient(url, key);

    const runFlush = () => {
      void (async () => {
        const updatePayload = readPendingOAuthSignupPayload();
        if (!updatePayload) return;

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { error } = await supabase.auth.updateUser({
          data: {
            marketing_opt_in: updatePayload.marketing_opt_in,
            ...(updatePayload.full_name ? { full_name: updatePayload.full_name } : {}),
          },
        });
        if (!error) {
          clearPendingOAuthSignupMetadata();
          const displayName =
            updatePayload.full_name ??
            (session.user.user_metadata?.full_name as string | undefined);
          posthog.identify(session.user.id, {
            email: session.user.email ?? undefined,
            name: displayName,
          });
        }
      })();
    };

    runFlush();
    const t1 = window.setTimeout(runFlush, 150);
    const t2 = window.setTimeout(runFlush, 600);
    const t3 = window.setTimeout(runFlush, 2000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        session?.user &&
        (event === "INITIAL_SESSION" ||
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED")
      ) {
        runFlush();
      }
    });

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
