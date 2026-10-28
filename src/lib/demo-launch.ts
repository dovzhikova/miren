import { demoStoryFromScan } from "@/lib/progress";
import { analyzePhoto, previewDataUrl, shrinkPhoto } from "@/lib/photos";
import { installDemoStory, mockHasScans, setWorkspace } from "@/lib/store";

/** Load the sample face, score it as demo data, and seed the follow-up routine. */
export async function startTenSecondDemo(): Promise<"installed" | "existing"> {
  setWorkspace("mock");
  if (mockHasScans()) return "existing";
  const response = await fetch("/demo/sample-face.jpg");
  if (!response.ok) throw new Error("The sample photo is missing.");
  const blob = await response.blob();
  const file = new File([blob], "sample-face.jpg", { type: blob.type || "image/jpeg" });
  const prepared = await shrinkPhoto(file);
  const scan = await analyzePhoto(prepared, "sample", "mock");
  const thumb = await previewDataUrl(prepared);
  installDemoStory(demoStoryFromScan({ ...scan, source: "sample", previewDataUrl: thumb || "/demo/sample-face.jpg" }));
  return "installed";
}
