# Miren judging readiness — 29 October 2026

**Status: not yet signed off for judging.** The deployed demo works; successful live provider results and organizer repository access remain unverified.

## Evidence captured

| Check | Result | Evidence / limit |
| --- | --- | --- |
| Devpost submission | Confirmed | Confirmation email dated 29 Oct 2026, subject “Submission confirmed: Miren”. Submission ID 1270715. |
| Edit deadline | Confirmed | 2 Nov 2026, 11:45 EST = 18:45 Asia/Jerusalem. |
| Public app | Passed | https://miren-beta.vercel.app/ opened without login; scan, results and makeup product routes rendered. |
| Production revision | Confirmed by Vercel metadata | Deployment dpl_BAhqbVznL46zF41qwVE6vUe3sFAq, READY, alias miren-beta.vercel.app; master SHA 7b13854d3f82e6f12d44e9afa283b2a18547952f. |
| Live configuration | Configured, not provider-tested | GET /api/config returned mode=live, liveAvailable=true and youcamConfigured=true. This checks configuration presence, not credential validity, provider entitlement, Redis health or remaining units. |
| Demo scan | Passed on production | Use the sample photo → Generate demo scores → Results. “Demo scores” and “DEMO DATA · GENERATED EXAMPLE SCORES” appeared. |
| Demo makeup | Passed on production | Makeup → Color Block Lipstick in Cinnabar → Try-on did not run. This demo did not send the photo to YouCam. No real after image was returned. |
| Mode isolation | Passed for observed flow | Switching this product page to My scans removed the demo photo/result and displayed “Scan first”. |
| Real Skin AI | Unverified | Browser upload could not complete reliably. Initial extensionless downloaded JPEG was rejected by MIME validation; a renamed JPEG upload attempt did not complete. No successful personal scan or provider result was observed. This is not evidence of a provider outage. |
| Real Makeup VTO | Unverified | No live source scan was available, so no real makeup result was obtained. |
| Real skin simulation | Unverified | Not exercised with a live scan. |
| Source access | Private; organizer access unverified | GitHub connector can read the repository. It cannot enumerate collaborators through its allowed endpoints; the logged-out browser cannot open repository settings. README's invitation instruction is not proof an invitation was sent or accepted. |
| Devpost links, text and video | Unverified | The submission edit URL redirects to Devpost login. Confirmation mail does not expose the actual submitted fields or video. No Devpost edits were made. |
| Automated checks on deployed SHA | Passed | https://github.com/dovzhikova/miren/actions/runs/40769477516 — completed successfully. These simulated-service checks do not prove production API success. |

## Fix in this branch

On the deployed demo scan, accessibility output incorrectly said “Sending the photo to YouCam Skin Analysis…”, while no YouCam call was made. The scan component now gives demo-specific visible progress and screen-reader copy. Live progress remains unchanged. HACKATHON.md now tells recorders to upload/take an authorized photo in My scans, and to claim live success only after observing real results.

This branch is not proof of a new production deployment. Verify the deployed commit and repeat the affected flow after rollout.

## Remaining release gates

1. Open the existing Devpost submission and verify its actual demo, repository and video links against README/HACKATHON. Confirm the video is public and 1–3 minutes, in English or with English translation, and shows the app working. Do not substitute a script for a reviewed recording.
2. In GitHub Settings → Collaborators, verify the organizer identity associated with contact_event@PerfectCorp.com. Confirm accepted access, not just a pending invitation; if pending, record that accurately. Do not make the repository public merely to bypass this check.
3. From a normal browser with authorized photo-processing consent, select My scans and upload/take a suitable photo. Do not select Use the sample photo. Obtain a successful live Skin AI result; record time, production SHA, model/profile and non-secret request/task references.
4. On that same live scan, choose a makeup product and Try this on. Verify a real returned after-image loads next to the source photo. Record the result separately from skin simulation.
5. If either request fails, inspect application/provider errors and authorized Vercel runtime logs. Current connector cannot access this team's environment settings until team access is authorized. Never record credentials, cookies, signed URLs, or photos in this checklist.
6. Recheck the final production URL after merging/deployment and keep the working project accessible through the end of judging (20 Nov 2026, 11:45 EST / 18:45 Israel).

## Submission wording to use only after the missing checks

“Demo data uses generated example scores and does not call YouCam. Use the sample photo always follows that demo path. For live processing, select My scans, consent to photo processing and upload or take a photo. Skin analysis and Makeup VTO results should be treated as verified only when the corresponding request succeeds. The cart starts a local routine and does not process payment. Comparisons describe observations, not proof that a product caused a change.”

Do not claim that organizer access is granted or that a live demo was verified until the corresponding gate above passes.

## Sources

- Repository: https://github.com/dovzhikova/miren
- Demo: https://miren-beta.vercel.app/
- Hackathon rules: https://youcam-api-skin-ai-ecommerce.devpost.com/rules
- Existing submission edit URL: https://devpost.com/submit-to/31400-youcam-api-skin-ai-ecommerce-vto-hackathon/manage/submissions/1270715-miren/edit
