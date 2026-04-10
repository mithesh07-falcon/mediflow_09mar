type ImagePayloadOptions = {
  maxDimension?: number;
  maxBase64Chars?: number;
  quality?: number;
  minQuality?: number;
};

const DEFAULT_OPTIONS: Required<ImagePayloadOptions> = {
  maxDimension: 720,
  maxBase64Chars: 900_000,
  quality: 0.6,
  minQuality: 0.25,
};

function resolveOptions(options?: ImagePayloadOptions): Required<ImagePayloadOptions> {
  return {
    ...DEFAULT_OPTIONS,
    ...options,
  };
}

function getScaledDimensions(width: number, height: number, maxDimension: number): { width: number; height: number } {
  const safeWidth = Math.max(1, width || 640);
  const safeHeight = Math.max(1, height || 480);
  const largestSide = Math.max(safeWidth, safeHeight);
  const ratio = largestSide > maxDimension ? maxDimension / largestSide : 1;

  return {
    width: Math.max(1, Math.round(safeWidth * ratio)),
    height: Math.max(1, Math.round(safeHeight * ratio)),
  };
}

function drawToCanvas(source: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create image context");
  }

  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

function encodeCanvasWithinLimit(canvas: HTMLCanvasElement, opts: Required<ImagePayloadOptions>): string {
  let workingCanvas = canvas;
  let quality = opts.quality;
  let base64 = workingCanvas.toDataURL("image/jpeg", quality).split(",")[1] || "";

  while (base64.length > opts.maxBase64Chars && quality > opts.minQuality) {
    quality = Math.max(opts.minQuality, Number((quality - 0.08).toFixed(2)));
    base64 = workingCanvas.toDataURL("image/jpeg", quality).split(",")[1] || "";
  }

  while (base64.length > opts.maxBase64Chars && workingCanvas.width > 200 && workingCanvas.height > 200) {
    const nextWidth = Math.max(200, Math.round(workingCanvas.width * 0.85));
    const nextHeight = Math.max(200, Math.round(workingCanvas.height * 0.85));
    workingCanvas = drawToCanvas(workingCanvas, nextWidth, nextHeight);
    base64 = workingCanvas.toDataURL("image/jpeg", opts.minQuality).split(",")[1] || "";
  }

  return base64;
}

export function captureVideoFrameForServerAction(video: HTMLVideoElement, options?: ImagePayloadOptions): string {
  const opts = resolveOptions(options);
  const sourceWidth = video.videoWidth || video.clientWidth || 640;
  const sourceHeight = video.videoHeight || video.clientHeight || 480;
  const scaled = getScaledDimensions(sourceWidth, sourceHeight, opts.maxDimension);
  const canvas = drawToCanvas(video, scaled.width, scaled.height);
  return encodeCanvasWithinLimit(canvas, opts);
}

export async function normalizeImageDataUrlForServerAction(dataUrl: string, options?: ImagePayloadOptions): Promise<string> {
  const opts = resolveOptions(options);
  const image = new Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Unable to decode uploaded image"));
    image.src = dataUrl;
  });

  const scaled = getScaledDimensions(image.width, image.height, opts.maxDimension);
  const canvas = drawToCanvas(image, scaled.width, scaled.height);
  return encodeCanvasWithinLimit(canvas, opts);
}