# GlowCheck: YouCam cosmetic analysis and product matching

## Product

The shopper has two questions: how does this product match the concerns on a scan, and what changed in later scans? GlowCheck links a curated catalog with cosmetic scores, saved products, a local routine, and habit check-ins.

A scan does not diagnose a condition or establish that a product caused a change. Catalog concern weights and matching thresholds are prototype heuristics. Skin simulation is an illustrative preview, not a product-outcome forecast.

## YouCam API map

All credentialed calls stay on the server.

| Step | Endpoint |
| --- | --- |
| Register source image | `POST /s2s/v2.0/file` |
| Upload image bytes | The returned presigned PUT URL and headers |
| Start skin analysis | `POST /s2s/v2.1/task/skin-analysis` |
| Poll analysis | `GET /s2s/v2.1/task/skin-analysis/{task_id}` |
| Start makeup preview | `POST /s2s/v2.0/task/makeup-vto` |
| Start skin simulation | `POST /s2s/v2.0/task/skin-simulation` |
| Poll preview | Corresponding task endpoint with the task ID |

HD and SD actions are kept separate. Moles and eyelid shape do not drive recommendations. UI scores are displayed; only measured raw scores enter longitudinal comparisons. The analysis profile is retained across asynchronous polling.

Makeup products use their colour payload. Skincare products use simulation intensities derived from catalog concern weights. Oiliness is omitted because the simulation slider adds shine.

Bearer API-key authentication is supported. An optional RSA public key enables the v1 token exchange, with a fallback to the v2 API-key bearer when that handshake is rejected. Invalid encryption keys are reported.

## Architecture

```mermaid
flowchart TD
  mode{Selected workspace} -->|Demo data| fixture[Generated example scores]
  mode -->|My scans| consent[Photo processing consent]
  consent --> session[Signed anonymous browser session]
  session --> quota[Atomic task-start quota]
  quota --> upload[YouCam file registration and image upload]
  upload --> analysis[Skin analysis or preview task]
  analysis --> poll[Session-bound signed polling token]
  poll --> parse[Parse measured raw scores and UI scores]
  parse --> personal[Personal history]
  fixture --> demo[Separate demo history]
  personal --> store[Browser scores and source-photo storage]
  demo --> store
  store --> routine[Per-product starting scan]
  routine --> compare[Comparable observations and cautious trend labels]
```

The source image is stored in IndexedDB for previews. A smaller thumbnail is used for display. Personal scans cannot receive generated follow-ups. API credentials, task ownership, quotas, and browser storage are described in README.md.

## Two-minute demonstration

1. **The question:** open the home screen. Explain product matching and later observations.
2. **The demo boundary:** keep the selector on Demo data. State that all scores in this run are generated examples and no provider request is being made.
3. **Scan:** choose the sample illustration and analyze. Show the focus concerns, then expand all concern scores if needed.
4. **Matching:** open Nighttime Repair plus. Explain that the catalog weight is a matching heuristic. Show the rationale and the notes from product text.
5. **Preview:** show the labeled demo preview and keyboard-operable comparison slider. Explain that an authorized live run uses the stored source image and the corresponding YouCam API.
6. **Routine:** add the product to the cart and choose Start tracking. No payment occurs. Generate a demo follow-up and show the dates, raw changes, and the statement that causation is unknown.
7. **Separation:** switch to My scans and show that the demo history and routine are absent. Return to Demo data to restore them.
8. **Privacy:** show the data explanation and deletion control.

For a live recording, first configure the credentials and safeguards, obtain photo-processing consent, and verify real provider responses. Never narrate the fixture as a live API result.

## Verification boundaries

Automated coverage includes parser and matching rules, missing raw scores, comparison compatibility, timing guards, source-photo dimensions, live upload/task/poll contracts against simulated services, task ownership, quotas, data migration, baseline retention, browser persistence, mobile navigation, deletion, and automated accessibility checks.

A passing simulated-service test does not demonstrate provider entitlement, real image acceptance, a real rendered preview, deployment, or hackathon submission. Confirm those separately with authorized credentials and the actual destination.

## Capture suggestions

Use a 390 by 844 viewport for home, scan, results, product rationale, preview, routine, mode separation, and privacy. Keep the mode label visible. Do not crop away demo labels or qualify a simulation as a prediction.
