/**
 * Verification test script for WebRTC helper logic:
 * - Deterministic tie-breaker selection (glare avoidance)
 * - ICE candidate queue buffering and flush order
 */

// 1. Tie-breaker glare avoidance logic
function shouldInitiate(localUserId, remoteUserId) {
  if (localUserId === remoteUserId) return false;
  return localUserId.localeCompare(remoteUserId) < 0;
}

// 2. Candidate buffering queue simulator
class PeerConnectionSimulator {
  constructor(id) {
    this.id = id;
    this.remoteDescription = null;
    this.addedCandidates = [];
  }

  setRemoteDescription(desc) {
    this.remoteDescription = desc;
  }

  addIceCandidate(cand) {
    this.addedCandidates.push(cand);
  }
}

class CandidateBufferSimulator {
  constructor() {
    this.queue = new Map(); // peerId -> candidates[]
  }

  bufferCandidate(peerId, candidate) {
    if (!this.queue.has(peerId)) {
      this.queue.set(peerId, []);
    }
    this.queue.get(peerId).push(candidate);
  }

  flushQueue(peerId, pc) {
    const list = this.queue.get(peerId) || [];
    this.queue.set(peerId, []); // clear
    for (const cand of list) {
      pc.addIceCandidate(cand);
    }
  }
}

function runTests() {
  console.log("=== Testing Deterministic P2P Tie-Breaker (Glare Avoidance) ===");
  
  const testCases = [
    { local: "userA", remote: "userB", expectedInitiate: true },
    { local: "userB", remote: "userA", expectedInitiate: false },
    { local: "123", remote: "456", expectedInitiate: true },
    { local: "456", remote: "123", expectedInitiate: false },
    { local: "admin", remote: "guest", expectedInitiate: true },
    { local: "guest", remote: "admin", expectedInitiate: false },
  ];

  let passed = true;

  for (const { local, remote, expectedInitiate } of testCases) {
    const actual = shouldInitiate(local, remote);
    const ok = actual === expectedInitiate;
    console.log(`Local: '${local}', Remote: '${remote}' -> Should Initiate: ${actual} [${ok ? "PASS" : "FAIL"}]`);
    if (!ok) passed = false;

    // Verify reciprocity: one and only one side initiates
    const reciprocal = shouldInitiate(remote, local);
    const reciprocalOk = reciprocal !== actual;
    if (!reciprocalOk) {
      console.error(`Glare Avoidance Fail: Both or neither initiated between ${local} and ${remote}`);
      passed = false;
    }
  }

  console.log("\n=== Testing ICE Candidate Queue Buffering ===");
  
  const buffer = new CandidateBufferSimulator();
  const pc = new PeerConnectionSimulator("peerX");

  // Simulate ICE candidates arriving before RemoteDescription is set
  const cand1 = { candidate: "candidate:1...", sdpMid: "0" };
  const cand2 = { candidate: "candidate:2...", sdpMid: "0" };

  console.log("Adding candidate 1 & 2 to buffer...");
  buffer.bufferCandidate("peerX", cand1);
  buffer.bufferCandidate("peerX", cand2);

  // Assert PC hasn't received them yet
  let queueOk1 = pc.addedCandidates.length === 0;
  console.log(`PC added candidates count before remote desc applied: ${pc.addedCandidates.length} [${queueOk1 ? "PASS" : "FAIL"}]`);
  if (!queueOk1) passed = false;

  // Simulate applying offer/answer (remote description set)
  console.log("Applying remote description...");
  pc.setRemoteDescription({ type: "offer", sdp: "v=0..." });

  // Flush buffer
  console.log("Flushing ICE candidate buffer...");
  buffer.flushQueue("peerX", pc);

  // Assert candidates are added now in correct order
  let queueOk2 = pc.addedCandidates.length === 2 && 
                 pc.addedCandidates[0] === cand1 && 
                 pc.addedCandidates[1] === cand2;
  console.log(`PC added candidates count after flush: ${pc.addedCandidates.length} [${queueOk2 ? "PASS" : "FAIL"}]`);
  if (!queueOk2) passed = false;

  // Simulate a candidate arriving after RemoteDescription is already set
  console.log("Simulating immediate addition for post-desc candidate...");
  const cand3 = { candidate: "candidate:3...", sdpMid: "0" };
  if (pc.remoteDescription) {
    pc.addIceCandidate(cand3);
  } else {
    buffer.bufferCandidate("peerX", cand3);
  }

  let queueOk3 = pc.addedCandidates.length === 3 && pc.addedCandidates[2] === cand3;
  console.log(`PC added candidates count after post-desc candidate: ${pc.addedCandidates.length} [${queueOk3 ? "PASS" : "FAIL"}]`);
  if (!queueOk3) passed = false;

  if (passed) {
    console.log("\nAll WebRTC helper logic tests passed successfully!");
    process.exit(0);
  } else {
    console.error("\nSome WebRTC tests failed.");
    process.exit(1);
  }
}

runTests();
