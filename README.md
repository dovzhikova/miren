# GlowCheck

GlowCheck is a mobile-first skincare check for the moment before a purchase, and the moment a few weeks later when you wonder if the product did anything.

A selfie goes to **YouCam AI Skin Analysis**. Scores come back per concern, in plain language. The face shelf is a catalog of Biologique Recherche, ZO Skin Health, and Circadia, prices in ₪, ranked by each product's original 0–1 concern scores against the low scores on the scan. The cart is checked before anything is added to a routine. A later scan compares YouCam's **raw** scores and marks each product **keep**, **patch-test**, or **switch**.

Product pages preview a treatment with **YouCam AI Skin Simulation**. The client can also call **YouCam AI Makeup Virtual Try-On** when a product is a tint. This catalog's products are treatments, so the preview is a simulation.

This is a cosmetic demo, not a medical device. Higher scores mean healthier-looking skin on YouCam's scale.

Without API keys the app runs in **sample mode** on a realistic fixture, including a mole and an eyelid score that are removed before matching.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the URL printed by Next.js. Sample mode needs no account.

The dev server may be bound to `0.0.0.0` and opened as `127.0.0.1`. That host is listed in `allowedDevOrigins` in `next.config.ts`. Without it, Next.js blocks HMR and the page stays a static shell.

```bash
npm test
npm run lint
npm run build
```

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `YOUCAM_API_KEY` | For live mode | API key from the [YouCam console](https://yce.makeupar.com/api-console/en/api-keys/). Sent as `Authorization: Bearer` on current v2 endpoints. |
| `YOUCAM_PUBLIC_KEY` | No | RSA X.509 public key (the console secret). When set, GlowCheck encrypts `client_id=<API key>&timestamp=<ms>` and posts it to `POST /s2s/v1.0/client/auth`. If that handshake is refused, requests fall back to the API-key bearer. A key that cannot encrypt at all is an error. |
| `YOUCAM_API_BASE` | No | Defaults to `https://yce-api-01.makeupar.com`. |
| `GLOWCHECK_FORCE_MOCK` | No | Set to `1` to stay in sample mode even if a key is present. |

Never commit `.env` or `.env.local`. `.env.example` has empty placeholders.

## What the screens do

- **Scan** — camera, upload, or the built-in sample illustration.
- **Results** — per-concern UI score, plain explanation, raw score kept for later. Moles and eyelid shape are filtered out.
- **Shelf** — default is a short For you routine (at most eight skincare products, mixed steps, suits ahead of patch-test) plus a short Makeup for you list. Browse all opens the face catalog and the colour products. Body, hair, and devices stay off the face list. Names stay as the brand wrote them. Prices show as ₪. Keyword warnings are a low-confidence note, not a Skip by themselves.
- **Habits** — three scan-matched suggestions on results. The Habits page is where you start, stop, and check in for the week. Not medical advice.
- **Product** — “Does this suit me?”, a brand-site photo when one is mapped, otherwise a neutral placeholder, then a skin-simulation preview. Search this product looks up the brand and name. There is no shop link.
- **Cart** — blocks a casual checkout when a line is a skip.
- **Routine** — baseline versus latest, per-concern deltas, keep / patch-test / switch. “Load sample follow-up” is a labeled demo second scan.

Photos are not stored on the server. A small thumbnail stays in this browser’s local storage.

## Deploy on Vercel

1. Import the repository. Framework preset: Next.js.
2. Add `YOUCAM_API_KEY` and, if you use the RSA handshake, `YOUCAM_PUBLIC_KEY` for Production and Preview.
3. Deploy. Leave the variables empty and the deployment stays in sample mode.

Skin analysis and try-on poll inside the route for about eight seconds, then the browser keeps polling `/api/task`. `maxDuration` on those routes is 60 seconds.

## Hackathon notes

See [HACKATHON.md](HACKATHON.md) for the problem, the exact YouCam endpoints, the architecture diagram, the screenshot list, and the demo-video script.

## License

[MIT](LICENSE).
