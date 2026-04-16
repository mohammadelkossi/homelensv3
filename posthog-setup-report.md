<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into HomeLens. Here is a summary of all changes made:

**New files created:**
- `instrumentation-client.ts` — Initializes posthog-js for client-side tracking on every page using Next.js 15.3+ instrumentation. Enables session replay, exception capture, and autocapture.
- `src/lib/posthog-server.ts` — Singleton PostHog Node.js client for server-side event capture in API routes.
- `next.config.mjs` — Updated with EU reverse proxy rewrites (`/ingest → eu.i.posthog.com`) to improve ad-blocker resistance.

**Environment variables set** in `homelens-v2/.env.local`:
- `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`
- `NEXT_PUBLIC_POSTHOG_HOST`

**Packages installed:** `posthog-js`, `posthog-node`

---

## Events instrumented

| Event | Description | File |
|---|---|---|
| `get_started_clicked` | User clicks "Get Started for Free" or "Get Started" CTA on the homepage | `src/app/page.tsx` |
| `property_url_submitted` | User submits a Rightmove URL and proceeds to the preferences panel | `src/app/preferences/page.tsx` |
| `report_generated` | User successfully generates a property report | `src/app/preferences/page.tsx` |
| `report_generation_failed` | Report generation fails due to an API error (also captures exception) | `src/app/preferences/page.tsx` |
| `upgrade_limit_shown` | User has exhausted their 3 free analyses and the upgrade prompt is shown | `src/app/preferences/page.tsx` |
| `upgrade_to_pro_clicked` | User clicks "Upgrade to Pro" inside the free-tier limit popup | `src/components/login-popup.tsx` |
| `user_signed_up` | User successfully creates a new account via email | `src/components/login-popup.tsx` |
| `user_logged_in` | User successfully logs in via email (also calls `posthog.identify()`) | `src/components/login-popup.tsx` |
| `checkout_initiated` | User is redirected to Stripe Checkout for the Pro plan | `src/components/Pricing.tsx` |
| `checkout_completed` | User lands on the checkout-success page confirming subscription | `src/app/checkout-success/page.tsx` |
| `subscription_activated` | **Server-side** — Stripe webhook confirms checkout and profile is upgraded | `src/app/api/stripe/webhook/route.ts` |
| `subscription_canceled` | **Server-side** — Stripe webhook processes subscription deletion | `src/app/api/stripe/webhook/route.ts` |

---

## Next steps

We've built a dashboard and five insights to keep an eye on user behavior:

**Dashboard:**
- [Analytics basics](https://eu.posthog.com/project/123680/dashboard/622696)

**Insights:**
- [Acquisition → Report Funnel](https://eu.posthog.com/project/123680/insights/EY1xTyIx) — Tracks the full top-of-funnel: Get Started → URL submitted → Report generated
- [Upgrade Conversion Funnel](https://eu.posthog.com/project/123680/insights/6HO5mNjL) — Limit reached → Upgrade clicked → Checkout initiated → Checkout completed
- [New Sign-ups Over Time](https://eu.posthog.com/project/123680/insights/uDKQAIQF) — Daily new user registrations
- [Reports Generated vs Failed](https://eu.posthog.com/project/123680/insights/Yas4Uj30) — Spot API/scraping issues early
- [Subscription Activations vs Cancellations](https://eu.posthog.com/project/123680/insights/3ksCJjYk) — Weekly subscription growth and churn

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
