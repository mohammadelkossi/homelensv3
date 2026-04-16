"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

export function PostHogProvider() {
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    if (!token) return;

    posthog.init(token, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
      defaults: "2026-01-30",
    });
  }, []);

  return null;
}
