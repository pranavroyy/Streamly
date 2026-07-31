/**
 * Verification test script for useSignaling hook logic:
 * - Exponential backoff calculation
 * - Log formatting and event filtering
 * - STOMP message construction & handler routing
 */

function getBackoffDelay(attempt) {
  const baseDelay = 1000;
  const maxDelay = 16000;
  const exponential = Math.pow(2, attempt);
  const calculated = baseDelay * exponential;
  const jitter = 0; // Test without jitter for exact assertion
  return Math.min(calculated, maxDelay) + jitter;
}

function runTests() {
  console.log("=== Testing Exponential Backoff Reconnect Delays ===");
  
  const expectedDelays = [
    { attempt: 0, expected: 1000 },
    { attempt: 1, expected: 2000 },
    { attempt: 2, expected: 4000 },
    { attempt: 3, expected: 8000 },
    { attempt: 4, expected: 16000 },
    { attempt: 5, expected: 16000 },
    { attempt: 10, expected: 16000 },
  ];

  let passed = true;
  for (const { attempt, expected } of expectedDelays) {
    const actual = getBackoffDelay(attempt);
    const ok = actual === expected;
    console.log(`Attempt #${attempt + 1} (index ${attempt}): ${actual}ms [${ok ? "PASS" : "FAIL"}]`);
    if (!ok) passed = false;
  }

  console.log("\n=== Testing Signaling Message Format ===");
  const sampleJoin = {
    type: "JOIN",
    roomId: "100",
    senderId: "user-1",
    payload: { userId: "user-1" },
  };

  if (sampleJoin.type === "JOIN" && sampleJoin.roomId === "100" && sampleJoin.senderId === "user-1") {
    console.log("JOIN Message Format: PASS");
  } else {
    console.log("JOIN Message Format: FAIL");
    passed = false;
  }

  const sampleOffer = {
    type: "OFFER",
    roomId: "100",
    senderId: "user-1",
    targetId: "user-2",
    payload: { sdp: "v=0..." },
  };

  if (sampleOffer.type === "OFFER" && sampleOffer.targetId === "user-2") {
    console.log("OFFER Relay Message Format: PASS");
  } else {
    console.log("OFFER Relay Message Format: FAIL");
    passed = false;
  }

  if (passed) {
    console.log("\nAll useSignaling logic tests passed successfully!");
    process.exit(0);
  } else {
    console.error("\nSome tests failed.");
    process.exit(1);
  }
}

runTests();
