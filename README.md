# GlowCheck

GlowCheck helps a shopper compare a skincare product with cosmetic skin-analysis scores, then record changes across later scans. It also includes makeup previews, saved products, and habit check-ins.

Scores and catalog matches are heuristics. A photo comparison cannot establish product safety, effectiveness, or the cause of a change. This is a cosmetic prototype.

## Run

Use Node.js 22 or newer.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open the URL printed by Next.js. No credentials are needed for Demo data.

## Demo data and My scans

The header switches between two separate workspaces. Each has its own scans, cart, routine, saved products, and habit check-ins.

- **Demo data:** every score is generated, including scores for uploaded photos. No YouCam API call is made. The sample illustration always enters this workspace, even if selected from My scans or when live credentials exist.
- **My scans:** requires configured YouCam credentials and durable request protection. There is no silent fallback to generated scores when the live service is unavailable.
- **Generated follow-ups:** available only in Demo data. They are dated 21 days after their baseline and remain labeled as generated examples.

Existing `glowcheck.v1` browser data is migrated to `glowcheck.v2`. Legacy generated follow-ups that inherited a live flag are moved into the demo history. Missing product baselines are reported instead of being replaced with unrelated scans.

## Photos and privacy

Before a personal scan, the user agrees to photo processing. Photos pass through the route handler to YouCam; GlowCheck has no server photo archive.

The browser keeps a small display thumbnail in localStorage and a separate API-quality image in IndexedDB. Previews read the source image, never the portrait thumbnail. If source storage is unavailable, an in-memory fallback works for that visit. After a reload, an unavailable original prompts a new scan.

Privacy and data explains this storage and provides a confirmed deletion action. It clears both workspaces, source images, saved products, check-ins, and the live-session cookie in this browser. It does not delete images already processed by YouCam.

## Live configuration

| Variable | Purpose |
| --- | --- |
| `YOUCAM_API_KEY` | Server-side YouCam bearer credential. |
| `YOUCAM_PUBLIC_KEY` | Optional RSA public key for the v1 handshake. |
| `YOUCAM_API_BASE` | Optional provider URL; defaults to `https://yce-api-01.makeupar.com`. |
| `GLOWCHECK_FORCE_MOCK` | `1` disables live processing. |
| `GLOWCHECK_SESSION_SECRET` | Random secret of at least 32 characters for session and task signatures. |
| `UPSTASH_REDIS_REST_URL` | HTTPS endpoint for durable atomic request counters. |
| `UPSTASH_REDIS_REST_TOKEN` | Server-side Redis REST token. |
| `GLOWCHECK_TASKS_PER_HOUR` | Maximum task starts per anonymous session per hour, default 5. |
| `GLOWCHECK_TASKS_PER_DAY` | Maximum task starts across the deployment per UTC day, default 100. |

Live routes fail closed if the session secret or quota service is missing or unavailable. Task starts reserve quota before any paid provider call. Retries consume task-start quota too. These caps count tasks, not YouCam units or money. Choose caps to fit the provider account's allowance.

`GET /api/config` creates a signed HttpOnly, SameSite=Strict session cookie when live processing is configured. Cookies last 24 hours. Delayed jobs return signed task tokens bound to that session, action, source, capture date, and analysis profile. Poll tokens expire after 20 minutes. Polling accepts no arbitrary provider task ID and is limited to 60 requests per session per minute.

The counters use the [Upstash Redis REST API](https://upstash.com/docs/redis/features/restapi) with an atomic Lua command. Store only anonymous session IDs and counters, never photos or provider credentials, in the quota database. Repeatedly minting sessions can bypass a session cap, so the deployment-wide cap remains mandatory; add deployment-level bot protection for a public launch.

Never commit real credentials. `.env.example` contains placeholders only. A deployment without the required live configuration remains a usable demo.

## Progress tracking

Each newly tracked product uses the latest scan in its own workspace as its starting scan. Recent history retains every baseline referenced by an active routine, even beyond the usual 12-scan window.

Comparisons require the same data origin, provider model, compatible SD/HD profile, valid chronology, and measured raw scores. Missing raw scores remain unavailable. UI scores are displayed but never substituted into raw comparisons.

A two-week observation window is applied before a product-specific trend label. This is an observation guard, not a validated treatment duration. Trend labels describe improved, declined, or unclear scores, with an explicit statement that causation is unknown. Makeup does not enter skin-effectiveness tracking.

## Catalog and previews

Catalog concern weights rank matches; they are not clinical efficacy measurements. Product detail explains this distinction. Treatment previews are illustrative skin simulations, not predicted outcomes. Makeup previews use the colour API.

Official image URLs are retained with their source metadata. Confirmed unavailable assets display a labeled placeholder without repeatedly requesting blocked images. Recheck flagged image URLs before restoring them.

The cart starts a local routine and never charges a payment. Saved products have a separate destination. Mobile navigation and the cart remain visible at 320px wide.

## Verification

```sh
npm test
npm run lint
npm audit
npx playwright install chromium webkit
npm run test:e2e
```

`test:e2e` creates a production build and runs the browser suite. `test:e2e:run` reuses an existing production build. Screenshots and traces go to the operating system's temporary directory, overridable with `GLOWCHECK_TEST_OUTPUT`.

The browser suite covers Chromium at 320px, 390px, and 1440px, plus mobile WebKit. It exercises demo scanning, source-photo persistence, preview polling, saving, cart quantities, routines, follow-ups, mode isolation, deletion, malformed storage, unavailable live processing, keyboard controls, and automated accessibility checks. Camera capture uses Chromium's simulated device; physical camera and real YouCam acceptance remain separate checks.

Unit integration tests simulate YouCam and Redis. Browser live-flow tests simulate API responses and check file dimensions in the browser; these tests spend no provider credits. The GitHub workflow runs lint, unit tests, dependency audit, production build, and browser checks.

## Deploy

Import into Vercel as a Next.js project. Configure the live variables only after verifying account access and choosing quotas. Validate a real personal scan and both preview types with authorized credentials before announcing live availability. No deployment is implied by passing local tests.

[MIT license](LICENSE). See [HACKATHON.md](HACKATHON.md) for a demo script and API map.
