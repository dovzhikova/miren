import { expect, test, type Page, type Request as PlaywrightRequest } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";
import { sampleBaselineScan } from "../src/lib/youcam/mock";

async function demoScan(page: Page) {
  await page.goto("/scan");
  await page.getByTestId("sample-photo").click();
  await page.getByTestId("analyze").click();
  await expect(page).toHaveURL(/\/results$/);
  await expect(page.getByText("Demo data · generated example scores")).toBeVisible();
}
async function assertAccessible(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations.map((violation) => ({ id: violation.id, nodes: violation.nodes.map((node) => node.target) }))).toEqual([]);
}

async function noHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
async function multipart(request: PlaywrightRequest) {
  return new Request(request.url(), { method: "POST", headers: { "content-type": request.headers()["content-type"] }, body: new Uint8Array(request.postDataBuffer()!).buffer }).formData();
}

test("navigation fits the viewport and all primary destinations remain reachable", async ({ page }, info) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Miren");
  await expect(page.getByRole("link", { name: "Miren", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await noHorizontalOverflow(page);
  await page.screenshot({ path: info.outputPath("home.png") });
  const cart = page.getByRole("link", { name: "Cart, 0 items" });
  const bounds = await cart.boundingBox();
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  const nav = page.getByRole("navigation", { name: info.project.name === "chromium-desktop" ? "Main" : "Mobile", exact: true });
  for (const name of ["Scan", "Shelf", "Habits", "Routine", "Saved"]) {
    await nav.getByRole("link", { name, exact: true }).click();
    await expect(page.getByRole("main")).not.toBeEmpty();
    await expect(nav.getByRole("link", { name, exact: true })).toHaveAttribute("aria-current", "page");
    await noHorizontalOverflow(page);
  }
  await page.screenshot({ path: info.outputPath("navigation.png") });
});

test("complete demo flow, preview, saved products, routine and habit persistence", async ({ page }, info) => {
  const errors: string[] = [];
  const failedRequests: { url: string; error: string | undefined }[] = [];
  const failedResponses: string[] = [];
  page.on("response", (response) => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`); });
  page.on("requestfailed", (request) => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await demoScan(page);
  await expect(page.getByText("All concern scores")).toBeVisible();
  await assertAccessible(page);
  await page.getByRole("tab", { name: "For you" }).click();
  await page.getByRole("link", { name: /Nighttime Repair plus Suits/ }).click();
  await page.getByTestId("try-on").click();
  await expect(page.getByText("Try-on did not run")).toBeVisible();
  await expect(page.getByRole("slider")).toHaveCount(0);
  await assertAccessible(page);
  await page.getByRole("button", { name: "Why this verdict" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Why this verdict" })).toBeFocused();
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await page.getByTestId("add-to-cart").click();
  await page.getByRole("link", { name: "Cart, 1 item", exact: true }).click();
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: "Decrease quantity" }).click();
  await page.getByRole("button", { name: "Start tracking", exact: true }).click();
  await expect(page).toHaveURL(/\/progress$/);
  await expect(page.getByText("Baseline saved", { exact: true })).toBeVisible();
  await page.getByTestId("sample-followup").click();
  await expect(page.getByText("Scores improved", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/does not establish what caused/)).toBeVisible();
  await assertAccessible(page);
  await noHorizontalOverflow(page);
  await page.screenshot({ path: info.outputPath("routine.png"), fullPage: true });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath("routine-screen.png") });
  await page.getByLabel("Data mode").selectOption("live");
  await expect(page.getByRole("heading", { name: "No baseline yet" })).toBeVisible();
  await expect(page.getByTestId("sample-followup")).toHaveCount(0);
  await page.getByLabel("Data mode").selectOption("mock");
  await expect(page.getByText("Scores improved", { exact: true }).first()).toBeVisible();
  await page.goto("/habits");
  await page.getByRole("button", { name: "Start", exact: true }).first().click();
  await page.getByRole("button", { name: "Check in today", exact: true }).click();
  await page.reload();
  await expect(page.getByText("Checked in today", { exact: true })).toBeVisible();
  await assertAccessible(page);
  await page.goto("/saved");
  await expect(page.getByRole("link", { name: "Nighttime Repair plus", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: "Nighttime Repair plus", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove from Saved" }).click();
  await expect(page.getByText("No products saved yet.")).toBeVisible();
  // WebKit logs canceled same-origin Next prefetches as access-control messages on forced reloads.
  // Actual HTTP failures, uncanceled requests, and all app exceptions still fail this check.
  const appErrors = errors.filter((message) => !(info.project.name === "webkit-mobile" && message.includes("127.0.0.1:3147/") && message.includes("?_rsc=") && message.endsWith("due to access control checks.")));
  expect([...appErrors, ...failedResponses, ...failedRequests.filter((request) => !/cancelled|aborted/i.test(request.error ?? ""))]).toEqual([]);
});

test("live UI uploads the source portrait after reload and polls using opaque task tokens", async ({ page, browserName }) => {
  const portrait = await sharp({ create: { width: 1200, height: 1600, channels: 3, background: "#bd9384" } }).jpeg().toBuffer();
  const live = { ...sampleBaselineScan(), id: "browser-live-scan", mode: "live", source: "upload", auth: "v2-api-key", engine: "youcam-skin-analysis-v2.1", profile: "hd", createdAt: new Date().toISOString() };
  let analyzed = false;
  let previewed = false;
  let scanPolls = 0;
  let previewPolls = 0;
  await page.addInitScript(() => {
    const observed: { path: string; size: number; width: number; height: number }[] = [];
    Object.assign(window, { glowcheckTestUploads: observed });
    const original = window.fetch;
    window.fetch = async (input, init) => {
      if (init?.body instanceof FormData && (String(input) === "/api/analyze" || String(input) === "/api/try-on")) {
        const image = init.body.get("image");
        if (image instanceof Blob) {
          const bitmap = await createImageBitmap(image);
          observed.push({ path: String(input), size: image.size, width: bitmap.width, height: bitmap.height });
          bitmap.close();
        }
      }
      return original(input, init);
    };
  });
  await page.route("**/api/config", (route) => route.fulfill({ json: { mode: "live", liveAvailable: true } }));
  await page.route("**/api/analyze", async (route) => {
    const form = await multipart(route.request());
    expect(form.get("mode")).toBe("live");
    const file = form.get("image") as File;
    // WebKit omits file contents from intercepted request bodies. Browser-side metadata is checked below.
    if (browserName !== "webkit") {
      const size = await sharp(Buffer.from(await file.arrayBuffer())).metadata();
      expect(Math.min(size.width!, size.height!)).toBeGreaterThanOrEqual(1080);
    }
    analyzed = true;
    await route.fulfill({ json: { mode: "live", status: "running", taskToken: "scan-token" } });
  });
  await page.route("**/api/task?token=scan-token", async (route) => {
    scanPolls += 1;
    await route.fulfill({ json: { mode: "live", status: "success", scan: live } });
  });
  await page.route("**/api/try-on", async (route) => {
    const form = await multipart(route.request());
    expect(form.get("mode")).toBe("live");
    const file = form.get("image") as File;
    // WebKit omits file contents from intercepted request bodies. Browser-side metadata is checked below.
    if (browserName !== "webkit") {
      const size = await sharp(Buffer.from(await file.arrayBuffer())).metadata();
      expect(Math.min(size.width!, size.height!)).toBeGreaterThanOrEqual(1080);
    }
    previewed = true;
    await route.fulfill({ json: { mode: "live", status: "running", taskToken: "preview-token", kind: "simulation", preview: {} } });
  });
  await page.route("**/api/task?token=preview-token", async (route) => {
    previewPolls += 1;
    await route.fulfill({ json: { mode: "live", status: "success", resultUrl: "/demo/sample-face.jpg" } });
  });
  await page.goto("/scan");
  await page.getByLabel("Data mode").selectOption("live");
  await page.getByRole("checkbox").check();
  await page.getByTestId("photo-input").setInputFiles({ name: "portrait.jpg", mimeType: "image/jpeg", buffer: portrait });
  await page.getByTestId("analyze").click();
  await expect(page).toHaveURL(/\/results$/);
  const uploads = await page.evaluate(() => (window as unknown as { glowcheckTestUploads: { path: string; size: number; width: number; height: number }[] }).glowcheckTestUploads);
  expect(uploads[0].size).toBeGreaterThan(0);
  expect(Math.min(uploads[0].width, uploads[0].height)).toBeGreaterThanOrEqual(1080);
  expect(analyzed).toBe(true);
  expect(scanPolls).toBe(1);
  // Display thumbnails may be discarded under localStorage pressure; the source must still work.
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("glowcheck.v2")!);
    delete saved.workspaces.live.scans[0].previewDataUrl;
    localStorage.setItem("glowcheck.v2", JSON.stringify(saved));
  });
  await page.goto("/shop/nighttimerepair");
  await page.reload();
  await page.getByTestId("try-on").click();
  await expect(page.getByAltText("YouCam try-on result")).toBeVisible();
  const previewUploads = await page.evaluate(() => (window as unknown as { glowcheckTestUploads: { path: string; size: number; width: number; height: number }[] }).glowcheckTestUploads);
  expect(previewUploads[0].path).toBe("/api/try-on");
  expect(Math.min(previewUploads[0].width, previewUploads[0].height)).toBeGreaterThanOrEqual(1080);
  expect(previewed).toBe(true);
  expect(previewPolls).toBe(1);
  await page.getByTestId("add-to-cart").click();
  await page.goto("/cart");
  await page.getByTestId("checkout").click();
  await expect(page.getByTestId("sample-followup")).toHaveCount(0);
  await page.getByLabel("Data mode").selectOption("mock");
  await expect(page.getByTestId("demo-story")).toBeVisible();
  await page.getByLabel("Data mode").selectOption("live");
  await expect(page.getByText("Baseline saved", { exact: true })).toBeVisible();
});

test("deletion clears both workspaces and the IndexedDB source photo", async ({ page }) => {
  await demoScan(page);
  await page.goto("/privacy");
  await page.getByRole("button", { name: "Delete my photos and history", exact: true }).click();
  await page.getByRole("button", { name: "Delete all local data", exact: true }).click();
  await expect(page).toHaveURL("/");
  expect(await page.evaluate(() => localStorage.getItem("glowcheck.v2"))).toBeNull();
  expect(await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open("glowcheck.photos", 1);
    request.onsuccess = () => {
      const db = request.result;
      const count = db.transaction("photos").objectStore("photos").count();
      count.onsuccess = () => { resolve(count.result); db.close(); };
      count.onerror = () => reject(count.error);
    };
  }))).toBe(0);
  await page.reload();
  await page.goto("/progress");
  await expect(page.getByTestId("demo-story")).toBeVisible();
  await expect(page.getByText("Pending")).toHaveCount(0);
});

test("malformed storage and absent photos recover without a blank page", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("glowcheck.v2", '{"version":2,"workspaces":{"mock":{"scans":[{"id":"broken"}]}}}'));
  await page.reload();
  await page.goto("/results");
  await expect(page.getByRole("heading", { name: "No scan yet" })).toBeVisible();
  await page.goto("/shop/nighttimerepair");
  await expect(page.getByTestId("try-on")).toHaveCount(0);
  await expect(page.getByText("Scan first. The preview uses the photo already on this device.")).toBeVisible();
});

test("unconfigured live service fails clearly without substituting demo scores", async ({ page }) => {
  let analyzeCalls = 0;
  page.on("request", (request) => { if (request.url().endsWith("/api/analyze")) analyzeCalls += 1; });
  await page.goto("/scan");
  await page.getByLabel("Data mode").selectOption("live");
  await page.getByRole("checkbox").check();
  const jpeg = await sharp({ create: { width: 600, height: 800, channels: 3, background: "#bd9384" } }).jpeg().toBuffer();
  await page.getByTestId("photo-input").setInputFiles({ name: "portrait.jpg", mimeType: "image/jpeg", buffer: jpeg });
  await page.getByTestId("analyze").click();
  await expect(page.getByRole("alert").filter({ hasText: "Personal scans are unavailable" })).toBeVisible();
  expect(analyzeCalls).toBe(0);
  await page.goto("/results");
  await expect(page.getByRole("heading", { name: "No scan yet" })).toBeVisible();
});

test("sample photos stay in the demo workspace when selected from My scans", async ({ page }) => {
  await page.goto("/scan");
  await page.getByLabel("Data mode").selectOption("live");
  await page.getByTestId("sample-photo").click();
  await page.getByTestId("analyze").click();
  await expect(page).toHaveURL(/\/results$/);
  await expect(page.getByLabel("Data mode")).toHaveValue("mock");
  await page.getByLabel("Data mode").selectOption("live");
  await expect(page.getByRole("heading", { name: "No scan yet" })).toBeVisible();
});

test("camera capture completes with a simulated camera", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "WebKit does not provide a simulated camera in this runner.");
  await context.grantPermissions(["camera"]);
  await page.goto("/scan");
  await page.getByRole("button", { name: "Take a selfie", exact: true }).click();
  await expect(page.getByRole("button", { name: "Shutter" })).toBeVisible();
  await expect.poll(() => page.locator("video").evaluate((video: HTMLVideoElement) => video.videoWidth)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Shutter" }).click();
  await expect(page).toHaveURL(/\/results$/);
  await expect(page.getByText("Demo data · generated example scores")).toBeVisible();
});

test("key pages have no WCAG A or AA axe violations", async ({ page }) => {
  for (const path of ["/", "/scan", "/shop", "/privacy"]) {
    await page.goto(path);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(result.violations, `${path}: ${JSON.stringify(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })))}`).toEqual([]);
  }
});

test("tablet widths keep the header and cart inside the viewport", async ({ page }) => {
  await page.goto("/");
  for (const width of [360, 440, 640, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await noHorizontalOverflow(page);
    const cart = await page.getByRole("link", { name: "Cart, 0 items" }).boundingBox();
    expect(cart!.x + cart!.width).toBeLessThanOrEqual(width);
  }
});

test("denied camera access keeps upload and sample recovery available", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => { throw new DOMException("Denied for test", "NotAllowedError"); };
  });
  await page.goto("/scan");
  await page.getByRole("button", { name: "Take a selfie", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "The camera stayed off" })).toBeVisible();
  await page.getByTestId("sample-photo").click();
  await page.getByTestId("analyze").click();
  await expect(page).toHaveURL(/\/results$/);
});

test("a failed preview can be retried without leaving a stale result", async ({ page }) => {
  await demoScan(page);
  await page.goto("/shop/nighttimerepair");
  let failed = false;
  await page.route("**/api/try-on", async (route) => {
    if (!failed) {
      failed = true;
      await route.fulfill({ status: 422, json: { error: "The preview could not finish. Try again." } });
    } else await route.continue();
  });
  await page.getByTestId("try-on").click();
  await expect(page.getByRole("alert").filter({ hasText: "The preview could not finish" })).toBeVisible();
  await expect(page.getByRole("slider")).toHaveCount(0);
  await page.getByTestId("try-on").click();
  await expect(page.getByRole("alert").filter({ hasText: "The preview could not finish" })).toHaveCount(0);
  await expect(page.getByText("Try-on did not run")).toBeVisible();
  await expect(page.getByRole("slider")).toHaveCount(0);
});

test("deletion in another tab clears cached scores in the current tab", async ({ page, context }) => {
  await demoScan(page);
  const other = await context.newPage();
  await other.goto("/privacy");
  await other.getByRole("button", { name: "Delete my photos and history", exact: true }).click();
  await other.getByRole("button", { name: "Delete all local data", exact: true }).click();
  await expect(other).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "No scan yet" })).toBeVisible();
  await other.close();
});
