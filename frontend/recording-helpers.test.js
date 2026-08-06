/**
 * Verification test script for Recording Helper logic:
 * - formatDuration edge cases (0s, 61s, 3600s, negative, NaN)
 * - getSupportedMimeType fallback chain using mocked MediaRecorder.isTypeSupported
 */

// Implementation matching src/lib/recording.ts
function formatDuration(totalSeconds) {
  if (isNaN(totalSeconds) || totalSeconds < 0) {
    return "00:00";
  }
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  const formattedMins = String(mins).padStart(2, "0");
  const formattedSecs = String(secs).padStart(2, "0");
  return `${formattedMins}:${formattedSecs}`;
}

function getSupportedMimeType() {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  if (
    typeof globalThis.MediaRecorder !== "undefined" &&
    typeof globalThis.MediaRecorder.isTypeSupported === "function"
  ) {
    for (const type of candidates) {
      if (globalThis.MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
  }

  return "video/webm";
}

function runRecordingTests() {
  console.log("=== Testing formatDuration Edge Cases ===");
  let passed = true;

  const durationTestCases = [
    { input: 0, expected: "00:00" },
    { input: 61, expected: "01:01" },
    { input: 3600, expected: "60:00" },
    { input: -10, expected: "00:00" },
    { input: NaN, expected: "00:00" },
  ];

  for (const { input, expected } of durationTestCases) {
    const actual = formatDuration(input);
    const ok = actual === expected;
    console.log(`formatDuration(${input}) -> '${actual}' (expected '${expected}') [${ok ? "PASS" : "FAIL"}]`);
    if (!ok) passed = false;
  }

  console.log("\n=== Testing getSupportedMimeType Fallback Chain ===");

  const originalMediaRecorder = globalThis.MediaRecorder;

  try {
    // Case 1: VP9 supported
    globalThis.MediaRecorder = {
      isTypeSupported: (type) => type === "video/webm;codecs=vp9,opus" || type === "video/webm;codecs=vp8,opus" || type === "video/webm",
    };
    let mime = getSupportedMimeType();
    let ok1 = mime === "video/webm;codecs=vp9,opus";
    console.log(`VP9 supported -> Got '${mime}' [${ok1 ? "PASS" : "FAIL"}]`);
    if (!ok1) passed = false;

    // Case 2: VP9 unsupported, VP8 supported
    globalThis.MediaRecorder = {
      isTypeSupported: (type) => type === "video/webm;codecs=vp8,opus" || type === "video/webm",
    };
    mime = getSupportedMimeType();
    let ok2 = mime === "video/webm;codecs=vp8,opus";
    console.log(`VP8 fallback -> Got '${mime}' [${ok2 ? "PASS" : "FAIL"}]`);
    if (!ok2) passed = false;

    // Case 3: VP9 & VP8 unsupported, video/webm supported
    globalThis.MediaRecorder = {
      isTypeSupported: (type) => type === "video/webm",
    };
    mime = getSupportedMimeType();
    let ok3 = mime === "video/webm";
    console.log(`video/webm fallback -> Got '${mime}' [${ok3 ? "PASS" : "FAIL"}]`);
    if (!ok3) passed = false;

    // Case 4: None supported
    globalThis.MediaRecorder = {
      isTypeSupported: () => false,
    };
    mime = getSupportedMimeType();
    let ok4 = mime === "video/webm";
    console.log(`None supported fallback -> Got '${mime}' [${ok4 ? "PASS" : "FAIL"}]`);
    if (!ok4) passed = false;

    // Case 5: MediaRecorder undefined
    delete globalThis.MediaRecorder;
    mime = getSupportedMimeType();
    let ok5 = mime === "video/webm";
    console.log(`MediaRecorder undefined fallback -> Got '${mime}' [${ok5 ? "PASS" : "FAIL"}]`);
    if (!ok5) passed = false;

  } finally {
    globalThis.MediaRecorder = originalMediaRecorder;
  }

  if (passed) {
    console.log("\nAll Recording helper tests passed successfully!");
    process.exit(0);
  } else {
    console.error("\nSome Recording helper tests failed.");
    process.exit(1);
  }
}

runRecordingTests();
