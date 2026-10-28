# Miren

A shopper can read a product page and still not know whether it is doing anything on their own face. Miren answers “is this product working on *my* face?” with one flow: a YouCam Skin AI scan, catalog matches for the low scores, makeup virtual try-on on that same photo, and a later scan compared on measured raw scores. Scores are a cosmetic read, not a diagnosis, and a photo comparison cannot prove that a product caused a change.

Demo: [https://miren-beta.vercel.app](https://miren-beta.vercel.app)

```sh
git clone https://github.com/dovzhikova/miren.git
```

This repository is private. To share it with the YouCam hackathon, invite `contact_event@PerfectCorp.com` (GitHub: Settings → Collaborators → Add people).

## YouCam APIs

Credentialed calls stay on the server. When `YOUCAM_API_KEY` is set and live access is fully configured, Skin analysis and makeup try-on use the real YouCam APIs. Demo data never calls them.

| Step | Endpoint |
| --- | --- |
| Register source image | `POST /s2s/v2.0/file` |
| Upload image bytes | Returned presigned PUT URL |
| Skin analysis | `POST /s2s/v2.1/task/skin-analysis` (HD or SD actions) |
| Poll analysis | `GET /s2s/v2.1/task/skin-analysis/{task_id}` |
| Makeup try-on | `POST /s2s/v2.0/task/makeup-vto` |
| Skin simulation | `POST /s2s/v2.0/task/skin-simulation` |
| Poll a preview | The matching task URL |

Optional RSA handshake: `POST /s2s/v1.0/client/auth` when `YOUCAM_PUBLIC_KEY` is set, with fallback to the API-key bearer. See [HACKATHON.md](HACKATHON.md) for the longer map.

## Run

Use Node.js 22 or newer.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open the URL printed by Next.js. No credentials are needed for Demo data.

## Demo data and My scans

The header switches between two separate workspaces. Each has its own scans, cart, routine, saved products, and habit check-ins. The control stays in the header but is visually quiet.

- **Live path (judged default when configured):** if YouCam credentials, the session secret, and Upstash are all set, a first visit opens **My scans**. A selfie or upload is sent to YouCam Skin Analysis. Makeup **Try this on** calls Makeup VTO and shows the returned before/after. There is no silent fallback to generated scores, and the demo “try-on did not run” line is not shown on that path.
- **Demo data:** every score is generated, including scores for uploaded photos. No YouCam API call is made. The sample photo always enters this workspace, even if selected from My scans or when live credentials exist. A try-on in this workspace does not invent a render.
- **Keys missing:** one banner states that YouCam is not connected. Try-on reports that it did not run.
- **Routine in demo mode:** the first open shows a pre-seeded baseline and a follow-up 21 days later, labeled as a generated example, so the tracker is not an empty Pending state. **Generate demo follow-up** is still there.
- **Generated follow-ups:** available only in Demo data. They stay labeled as generated examples.

Existing `glowcheck.v1` browser data is migrated to `glowcheck.v2`. Legacy generated follow-ups that inherited a live flag are moved into the demo history. Missing product baselines are reported instead of being replaced with unrelated scans.

## Photos and privacy

Before a personal scan, the user agrees to photo processing. Photos pass through the route handler to YouCam; Miren has no server photo archive.

The browser keeps a small display thumbnail in localStorage and a separate API-quality image in IndexedDB. Previews read the source image, never the portrait thumbnail. If source storage is unavailable, an in-memory fallback works for that visit. After a reload, an unavailable original prompts a new scan.

Privacy and data explains this storage and provides a confirmed deletion action. It clears both workspaces, source images, saved products, check-ins, and the live-session cookie in this browser. It does not delete images already processed by YouCam.

## Live configuration

| Variable | Purpose |
| --- | --- |
| `YOUCAM_API_KEY` | Server-side YouCam bearer credential. |
| `YOUCAM_PUBLIC_KEY` | Optional RSA public key for the v1 handshake. |
| `YOUCAM_API_BASE` | Optional provider URL; defaults to `https://yce-api-01.makeupar.com`. |
| `MIREN_FORCE_MOCK` | `1` disables live processing. |
| `MIREN_SESSION_SECRET` | Random secret of at least 32 characters for session and task signatures. |
| `UPSTASH_REDIS_REST_URL` | HTTPS endpoint for durable atomic request counters. |
| `UPSTASH_REDIS_REST_TOKEN` | Server-side Redis REST token. |
| `KV_REST_API_URL` | Alias for the REST URL when `UPSTASH_REDIS_REST_URL` is unset. Injected by the Vercel Marketplace Upstash integration. |
| `KV_REST_API_TOKEN` | Alias for the REST token when `UPSTASH_REDIS_REST_TOKEN` is unset. |
| `MIREN_TASKS_PER_HOUR` | Maximum task starts per anonymous session per hour, default 5. |
| `MIREN_TASKS_PER_DAY` | Maximum task starts across the deployment per UTC day, default 100. |

The `MIREN_` variables were named `GLOWCHECK_` before the rename; the old names are still read when the new ones are unset.

Live routes fail closed if the session secret or quota service is missing or unavailable. A task start must come from this page (same-origin POST with an `Origin` header) and a valid session before the photo is decoded. Quota is reserved only after the photo is known to be usable, and before any paid provider call. Retries consume task-start quota too. These caps count tasks, not YouCam units or money. Choose caps to fit the provider account's allowance.

`GET /api/config` creates a signed HttpOnly, SameSite=Strict session cookie when live processing is configured. Cookies last 24 hours. Delayed jobs return signed task tokens bound to that session, action, source, capture date, and analysis profile. Poll tokens expire after 20 minutes. Polling accepts no arbitrary provider task ID and is limited to 60 requests per session per minute.

The counters use the [Upstash Redis REST API](https://upstash.com/docs/redis/features/restapi) with an atomic Lua command. Store only anonymous session IDs and counters, never photos or provider credentials, in the quota database. Repeatedly minting sessions can bypass a session cap, so the deployment-wide cap remains mandatory. On Vercel, task starts also pass a [Vercel BotID](https://vercel.com/docs/botid) check; if that check is unavailable, the route fails closed. BotID runs only on Vercel deployments.

Never commit real credentials. `.env.example` contains placeholders only. A deployment without the required live configuration remains a usable demo.

## Progress tracking

Each newly tracked product uses the latest scan in its own workspace as its starting scan. Recent history retains every baseline referenced by an active routine, even beyond the usual 12-scan window.

Comparisons require the same data origin, provider model, compatible SD/HD profile, valid chronology, and measured raw scores. Missing raw scores remain unavailable. UI scores are displayed but never substituted into raw comparisons.

A two-week observation window is applied before a product-specific trend label. This is an observation guard, not a validated treatment duration. Trend labels describe improved, declined, or unclear scores, with an explicit statement that causation is unknown. Makeup does not enter skin-effectiveness tracking.

## Catalog and previews

Catalog concern weights rank matches; they are not clinical efficacy measurements. Product detail explains this distinction. Treatment previews are illustrative skin simulations, not predicted outcomes. Makeup previews use the colour API.

Official image URLs are brand Shopify or brand-site CDN links only. Cosmedoc and Tilda URLs are rejected. Packshots are square, with `object-fit: contain` on a soft neutral background. ZO Skin Health demandware files that previously returned 403 were rechecked on 24 October 2026 and restored, including Daily Sheer Broad Spectrum SPF 50. Circadia Nighttime Repair plus uses the Circadia Shopify CDN.

The sample face on the home screen and in **Use the sample photo** is the same file: [Pexels photo 415829](https://www.pexels.com/photo/woman-wearing-black-spaghetti-strap-top-415829/), “Woman Wearing Black Spaghetti Strap Top” by Pixabay, used under the [Pexels License](https://www.pexels.com/license/). It replaces an earlier cartoon illustration.

The cart starts a local routine and never charges a payment. Saved products have a separate destination. Mobile navigation and the cart remain visible at 320px wide.

## Verification

```sh
npm test
npm run lint
npm audit --audit-level=moderate
npx playwright install chromium webkit
npm run test:e2e
```

`test:e2e` creates a production build and runs the browser suite. `test:e2e:run` reuses an existing production build. Screenshots and traces go to the operating system's temporary directory, overridable with `MIREN_TEST_OUTPUT`.

The browser suite covers Chromium at 320px, 390px, and 1440px, plus mobile WebKit. It exercises demo scanning, source-photo persistence, preview polling, saving, cart quantities, routines, follow-ups, mode isolation, deletion, malformed storage, unavailable live processing, keyboard controls, and automated accessibility checks. Camera capture uses Chromium's simulated device; physical camera and real YouCam acceptance remain separate checks.

Unit integration tests simulate YouCam and Redis. Browser live-flow tests simulate API responses and check file dimensions in the browser; these tests spend no provider credits. The GitHub workflow runs lint, unit tests, a dependency audit that fails at moderate severity or higher, production build, and browser checks. Low-severity advisories in `shadcn`'s `deepmerge` dependency have no non-breaking fix, so they stay reported and do not fail the gate.

## Deploy

Import into Vercel as a Next.js project. Configure the live variables only after verifying account access and choosing quotas. Validate a real personal scan and both preview types with authorized credentials before announcing live availability. No deployment is implied by passing local tests.

[MIT license](LICENSE). See [HACKATHON.md](HACKATHON.md) for a demo script and API map.
