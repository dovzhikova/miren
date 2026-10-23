"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CameraIcon, ImagePlusIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { analyzePhoto, previewDataUrl } from "@/lib/photos";
import { addScan } from "@/lib/store";
import type { Scan } from "@/lib/types";

const steps = [
  "Face a window. Colored lights shift the scores.",
  "Look straight on. Hair off the forehead, glasses off if you can.",
  "Fill the frame with your face, forehead to chin.",
];

export function ScanStudio() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [source, setSource] = useState<Scan["source"]>("upload");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraOn]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  async function startCamera() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1600 } },
      });
      streamRef.current = stream;
      setCameraOn(true);
    } catch {
      setError("The camera stayed off. Upload a photo instead, or allow camera access and try again.");
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) {
        setError("Could not grab that frame. Try the upload instead.");
        return;
      }
      const next = new File([blob], "selfie.jpg", { type: "image/jpeg" });
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
      setFile(next);
      setPreview(URL.createObjectURL(blob));
      setSource("camera");
      stopCamera();
    }, "image/jpeg", 0.92);
  }

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
    setBusy(true);
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
      setBusy(false);
      setStatus("");
    }
  }

  async function analyze() {
    if (!file) {
      setError("Add a photo first.");
      return;
    }
    setBusy(true);
    setError("");
    setStatus("Sending the photo to YouCam Skin Analysis…");
    try {
      const scan = await analyzePhoto(file, source);
      const thumb = await previewDataUrl(file);
      addScan({ ...scan, source, previewDataUrl: thumb });
      toast.success(scan.mode === "mock" ? "Sample scan saved" : "Scan saved");
      router.push("/results");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The scan did not finish.");
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">YouCam Skin Analysis</p>
        <h1 className="font-heading text-3xl tracking-tight sm:text-4xl">Take the photo the scores depend on</h1>
        <p className="max-w-2xl text-muted-foreground">
          One clear selfie. GlowCheck uploads it, asks YouCam for per-concern scores, and drops moles and eyelid shape before it recommends anything.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Photo</CardTitle>
            <CardDescription>Nothing is stored on the server. The thumbnail stays in this browser.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-xl bg-muted">
              {cameraOn ? (
                <video ref={videoRef} autoPlay playsInline muted className="aspect-[3/4] w-full object-cover" />
              ) : preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Selected face photo" className="aspect-[3/4] w-full object-cover" />
              ) : (
                <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
                  <CameraIcon />
                  <p>No photo yet. Use the camera, upload one, or load the sample face.</p>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {cameraOn ? (
                <>
                  <Button type="button" className="h-11 flex-1" onClick={capture}>
                    Use this frame
                  </Button>
                  <Button type="button" variant="outline" className="h-11" onClick={stopCamera}>
                    Close camera
                  </Button>
                </>
              ) : (
                <Button type="button" variant="outline" className="h-11" onClick={startCamera}>
                  <CameraIcon data-icon="inline-start" />
                  Open camera
                </Button>
              )}
              <label className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border bg-background px-3 text-sm font-medium hover:bg-muted">
                <ImagePlusIcon className="size-4" />
                Upload
                <input
                  data-testid="photo-input"
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => onFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <Button type="button" variant="secondary" className="h-11" onClick={useSample} disabled={busy} data-testid="sample-photo">
              <SparklesIcon data-icon="inline-start" />
              Use the sample photo
            </Button>
            <Button type="button" className="h-11" onClick={analyze} disabled={busy || !file} data-testid="analyze">
              {busy ? status || "Reading the photo…" : "Analyze with YouCam"}
            </Button>
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Try that again</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Before you shoot</CardTitle>
            <CardDescription>YouCam rejects photos with no face, a turned head, or a face that is too small.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-3">
              {steps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
