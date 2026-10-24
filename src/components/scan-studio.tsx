"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CameraIcon, CheckIcon, ImagePlusIcon, SparklesIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { WhySheet } from "@/components/why-sheet";
import { analyzePhoto, previewDataUrl, shrinkPhoto } from "@/lib/photos";
import { savePhoto } from "@/lib/photo-vault";
import { addScan, useGlow } from "@/lib/store";
import type { Scan } from "@/lib/types";

const tips = [
  "Face a window. Colored lights shift the scores.",
  "Look straight on. Hair off the forehead, glasses off if you can.",
  "Fill the frame with your face, forehead to chin.",
];

const analyzingCopy = ["Mapping pores…", "Checking redness…", "Reading texture…", "Scoring hydration…"];

type Check = "wait" | "pass" | "warn";

export function ScanStudio() {
  const { workspace } = useGlow();
  return <ScanContent key={workspace} />;
}

function ScanContent() {
  const router = useRouter();
  const { workspace } = useGlow();
  const [consent, setConsent] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoRef = useRef(false);
  const captureRef = useRef<() => void>(() => {});
  const [cameraOn, setCameraOn] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [source, setSource] = useState<Scan["source"]>("upload");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [phrase, setPhrase] = useState(0);
  const [error, setError] = useState("");
  const [tipsOpen, setTipsOpen] = useState(false);
  const [lighting, setLighting] = useState<Check>("wait");
  const [centered, setCentered] = useState<Check>("wait");
  const [makeup, setMakeup] = useState<Check>("warn");

  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraOn]);

  useEffect(() => {
    return () => {
      requestRef.current?.abort();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(() => setPhrase((value) => (value + 1) % analyzingCopy.length), 1400);
    return () => window.clearInterval(timer);
  }, [busy]);

  useEffect(() => {
    if (!cameraOn) return;
    const timer = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || !video.videoWidth) return;
      const reading = measureFrame(video);
      setLighting(reading.lighting ? "pass" : "warn");
    }, 400);
    return () => window.clearInterval(timer);
  }, [cameraOn]);

  useEffect(() => {
    if (!cameraOn || busy || autoRef.current) return;
    if (lighting === "pass" && centered === "pass" && makeup === "pass") {
      const timer = window.setTimeout(() => {
        captureRef.current();
      }, 900);
      return () => window.clearTimeout(timer);
    }
  }, [cameraOn, busy, lighting, centered, makeup]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
    autoRef.current = false;
  }

  async function startCamera() {
    setError("");
    if (workspace === "live" && !consent) { setError("Agree to photo processing before opening the camera."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1600 } },
      });
      streamRef.current = stream;
      setLighting("wait");
      setCentered("wait");
      setMakeup("warn");
      setCameraOn(true);
    } catch {
      setError("The camera stayed off. Upload a photo instead, or allow camera access and try again.");
    }
  }

  async function run(next: File, nextSource: Scan["source"]) {
    if (nextSource !== "sample" && workspace === "live" && !consent) {
      setError("Agree to photo processing before starting a personal scan.");
      return;
    }
    setBusy(true);
    setError("");
    setStatus("Sending the photo to YouCam Skin Analysis…");
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    try {
      const prepared = await shrinkPhoto(next);
      controller.signal.throwIfAborted();
      const scan = await analyzePhoto(prepared, nextSource, nextSource === "sample" ? "mock" : workspace, controller.signal);
      const [thumb, persisted] = await Promise.all([previewDataUrl(next), savePhoto(scan.id, prepared)]);
      controller.signal.throwIfAborted();
      addScan({ ...scan, source: nextSource, previewDataUrl: thumb });
      toast.success(scan.mode === "mock" ? "Demo scan saved" : "Scan saved");
      if (!persisted) toast.warning("Photo storage is unavailable. Previews work for this visit; rescan after reloading.");
      router.push("/results");
    } catch (caught) {
      if (controller.signal.aborted) return;
      setError(caught instanceof Error ? caught.message : "The scan did not finish.");
      setBusy(false);
      setStatus("");
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || autoRef.current) return;
    autoRef.current = true;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) {
        autoRef.current = false;
        setError("Could not grab that frame. Try the upload instead.");
        return;
      }
      const next = new File([blob], "selfie.jpg", { type: "image/jpeg" });
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
      setFile(next);
      setPreview(URL.createObjectURL(blob));
      setSource("camera");
      stopCamera();
      void run(next, "camera");
    }, "image/jpeg", 0.92);
  }

  useEffect(() => {
    captureRef.current = capture;
  });

  function onFile(next: File | null) {
    setError("");
    if (!next) return;
    if (!/^image\/(jpeg|png|webp)$/.test(next.type)) {
      setError("Use a JPEG, PNG, or WebP.");
      return;
    }
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setSource("upload");
    stopCamera();
  }

  async function useSample() {
    setError("");
    setStatus("Loading the sample photo…");
    try {
      const response = await fetch("/demo/sample-face.jpg");
      if (!response.ok) throw new Error("The sample photo is missing.");
      const blob = await response.blob();
      const next = new File([blob], "sample-face.jpg", { type: "image/jpeg" });
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
      setFile(next);
      setPreview(URL.createObjectURL(blob));
      setSource("sample");
      stopCamera();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load the sample photo.");
    } finally {
      setStatus("");
    }
  }

  async function analyze() {
    if (!file) {
      setError("Add a photo first.");
      return;
    }
    await run(file, source);
  }

  const passed = [lighting, centered, makeup].filter((item) => item === "pass").length;

  if (cameraOn) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[var(--camera-bg)] text-white">
        <div className="flex items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))]">
          <button type="button" className="grid size-11 place-items-center rounded-full border border-white/30" onClick={() => setTipsOpen(true)} aria-label="Tips">
            <span className="text-lg">?</span>
          </button>
          <button type="button" className="grid size-11 place-items-center rounded-full border border-white/30" onClick={stopCamera} aria-label="Close camera">
            <XIcon />
          </button>
        </div>
        <div className="relative mx-auto mt-6 aspect-[3/4] w-[72%] max-w-[320px]">
          <svg className="absolute -inset-3 h-[calc(100%+24px)] w-[calc(100%+24px)]" viewBox="0 0 100 130" aria-hidden>
            <ellipse cx="50" cy="65" rx="46" ry="60" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
            <ellipse
              cx="50"
              cy="65"
              rx="46"
              ry="60"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={`${(passed / 3) * 320} 320`}
              transform="rotate(-90 50 65)"
            />
          </svg>
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full rounded-[50%] object-cover [transform:scaleX(-1)]" />
        </div>
        <div className="mt-auto px-5 pb-[max(20px,env(safe-area-inset-bottom))]">
          <div className="rounded-[12px] bg-white p-4 text-[var(--ink)]">
            <p className="text-[17px] leading-[1.3] font-semibold">Hold still…</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <CheckChip label="Lighting" state={lighting} />
              <button type="button" aria-pressed={centered === "pass"} onClick={() => setCentered((value) => value === "pass" ? "wait" : "pass")}><CheckChip label="Face framed" state={centered} /></button>
              <button type="button" onClick={() => setMakeup((value) => (value === "pass" ? "warn" : "pass"))}>
                <CheckChip label="No makeup" state={makeup} />
              </button>
            </div>
            <p className="mt-3 text-[13px] text-[var(--meta)]">Confirm “Face framed” and “No makeup” when you are ready. The shutter is there if the checks stay cautious.</p>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <button type="button" className="text-[13px] font-semibold text-white/80" onClick={useSample} data-testid="sample-photo">
              Sample photo
            </button>
            <button type="button" className="grid size-[72px] place-items-center rounded-full border-4 border-white/80" onClick={capture} aria-label="Shutter">
              <span className="size-14 rounded-full bg-white" />
            </button>
            <span className="w-16" />
          </div>
        </div>
        <WhySheet open={tipsOpen} title="A photo the scores can trust" onClose={() => setTipsOpen(false)}>
          {tips.map((tip) => (
            <p key={tip}>{tip}</p>
          ))}
        </WhySheet>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="micro">YouCam Skin Analysis</p>
        <h1 className="font-display text-[28px] leading-[1.15] font-bold">Take the photo the scores depend on</h1>
        <p className="text-[15px] text-[var(--ink-2)]">One clear selfie. Moles and eyelid shape are dropped before anything is recommended.</p>
      </div>

      <div className="rounded-[12px] bg-[var(--surface-2)] p-4 text-[13px]">
        {workspace === "mock" || source === "sample" ? (
          <p>Demo data uses generated example scores. YouCam is not called for this photo.</p>
        ) : (
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-1 size-5 shrink-0" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span>I agree to send this photo to YouCam for cosmetic analysis. The photo and scores are saved on this device for previews and comparisons. I can delete them in Privacy and data.</span>
          </label>
        )}
      </div>

      <div className="relative mx-auto h-[300px] w-[240px]">
        <div className="relative h-full w-full overflow-hidden rounded-[50%] bg-[var(--surface-2)] ring-1 ring-[var(--ink)]">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Selected face photo" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center px-6 text-center text-[13px] text-[var(--meta)]">
              Camera, upload, or the sample face.
            </div>
          )}
          {busy && <div className="scanline" />}
        </div>
      </div>

      {busy ? (
        <p className="text-center text-[17px] font-semibold" aria-live="polite">
          {analyzingCopy[phrase]}
        </p>
      ) : (
        <div className="flex flex-col gap-2" id="upload">
          <button type="button" className={file ? "btn-secondary w-full" : "btn-primary w-full"} onClick={startCamera}>
            <CameraIcon className="mr-2 size-4" />
            Take a selfie
          </button>
          <label className="btn-secondary w-full cursor-pointer">
            <ImagePlusIcon className="mr-2 size-4" />
            Upload a photo
            <input
              data-testid="photo-input"
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => onFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <button type="button" className="btn-ghost h-11" onClick={useSample} disabled={busy} data-testid="sample-photo">
            <SparklesIcon className="mr-1 inline size-4" />
            Use the sample photo
          </button>
          <button type="button" className={file ? "btn-primary w-full" : "btn-secondary w-full"} onClick={analyze} disabled={busy || !file} data-testid="analyze">
            {file ? "Analyze with YouCam" : "Add a photo to analyze"}
          </button>
        </div>
      )}

      {status && busy && <p className="sr-only">{status}</p>}
      {error && (
        <p className="rounded-[16px] bg-[var(--skip-bg)] px-4 py-3 text-[13px] text-[var(--skip)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function CheckChip({ label, state }: { label: string; state: Check }) {
  const tone = state === "pass" ? "bg-[var(--suits-bg)] text-[var(--suits)]" : state === "warn" ? "bg-[var(--patch-bg)] text-[var(--patch)]" : "bg-[var(--surface-2)] text-[var(--meta)]";
  return (
    <span className={`inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[13px] font-semibold ${tone}`}>
      {state === "pass" ? <CheckIcon className="size-3.5" /> : null}
      {label}
      {state === "pass" ? " ✓" : state === "warn" ? " ⚠" : ""}
    </span>
  );
}

function measureFrame(video: HTMLVideoElement): { lighting: boolean } {
  const canvas = document.createElement("canvas");
  canvas.width = 80;
  canvas.height = 100;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return { lighting: false };
  context.drawImage(video, 0, 0, 80, 100);
  const { data } = context.getImageData(0, 0, 80, 100);
  let sum = 0;
  for (let y = 0; y < 100; y += 1) {
    for (let x = 0; x < 80; x += 1) {
      const index = (y * 80 + x) * 4;
      const red = data[index] ?? 0;
      const green = data[index + 1] ?? 0;
      const blue = data[index + 2] ?? 0;
      const luma = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      sum += luma;
    }
  }
  const mean = sum / (80 * 100);
  return { lighting: mean > 55 && mean < 210 };
}
