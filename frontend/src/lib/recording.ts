/**
 * Pure helper functions for local MediaRecorder capture & download.
 */

/**
 * Returns the best supported WebM MIME type for MediaRecorder.
 * Fallback chain:
 * 1. video/webm;codecs=vp9,opus
 * 2. video/webm;codecs=vp8,opus
 * 3. video/webm
 */
export function getSupportedMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  if (
    typeof MediaRecorder !== "undefined" &&
    typeof MediaRecorder.isTypeSupported === "function"
  ) {
    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
  }

  return "video/webm";
}

/**
 * Formats duration in seconds into `mm:ss`.
 * Examples: 0 -> "00:00", 61 -> "01:01", 3600 -> "60:00".
 */
export function formatDuration(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) {
    return "00:00";
  }
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  const formattedMins = String(mins).padStart(2, "0");
  const formattedSecs = String(secs).padStart(2, "0");
  return `${formattedMins}:${formattedSecs}`;
}

/**
 * Creates an object URL for the Blob, triggers a hidden `<a download>` click,
 * and revokes the URL after.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}
