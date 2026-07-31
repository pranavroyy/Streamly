/**
 * Streamly Signaling Integration Test Suite
 * ------------------------------------------
 * Drives real STOMP/SockJS clients against your running Spring Boot backend
 * and checks every item on the test checklist, plus the full signaling
 * relay flow (JOIN -> OFFER -> ANSWER -> ICE -> disconnect/LEAVE).
 *
 * Suites:
 *   1. Two clients join same room        -> both get peer-joined
 *   2. Room isolation                    -> messages never cross rooms
 *   3. Disconnect -> peer-left            -> LEAVE fires after grace period
 *   4. Reconnect within grace period      -> rejoin, no LEAVE, fresh ROOM_STATE
 *   5. Full relay flow                    -> OFFER/ANSWER/ICE stay private + ERROR path
 *
 * Run: node test-signaling.js
 * (start the backend first: mvn spring-boot:run, or via your IDE)
 */

const SockJS = require('sockjs-client');
const { Client } = require('@stomp/stompjs');

// context-path (/api) + the /ws STOMP endpoint registered in WebSocketConfig
const BASE_WS_URL = 'http://localhost:8080/api/ws';

// Must match websocket.reconnect.grace-period-ms in application.yml (default 5000).
// If you've overridden it via env var / -D flag, update this to match or the
// timing assertions below will be testing the wrong window.
const GRACE_PERIOD_MS = 5000;

let pass = 0;
let fail = 0;
// Filled in by Suite 3 with the real observed disconnect->LEAVE delay, so Suite 4
// can time itself off reality instead of the GRACE_PERIOD_MS guess at the top of this file.
let measuredGracePeriodMs = null;

function check(label, condition) {
  if (condition) {
    console.log(`  \x1b[32m✓ PASS\x1b[0m ${label}`);
    pass++;
  } else {
    console.log(`  \x1b[31m✗ FAIL\x1b[0m ${label}`);
    fail++;
  }
}

function section(msg) {
  console.log(`\n\x1b[35m========== ${msg} ==========\x1b[0m`);
}

function log(msg) {
  console.log(`\n\x1b[36m${msg}\x1b[0m`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function makeClient(userId) {
  return new Client({
    webSocketFactory: () => new SockJS(BASE_WS_URL),
    connectHeaders: { userId }, // read by WebSocketConfig's CONNECT interceptor -> sets the STOMP Principal
    reconnectDelay: 0,
    debug: () => {}, // set to console.log for verbose STOMP frame tracing
  });
}

function connect(client) {
  return new Promise((resolve, reject) => {
    client.onConnect = () => resolve();
    client.onStompError = (frame) => reject(new Error('STOMP error: ' + frame.headers.message));
    client.onWebSocketError = (err) => reject(err);
    client.activate();
  });
}

function waitForMessage(destination, client, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting on ${destination}`)), timeoutMs);
    const sub = client.subscribe(destination, (msg) => {
      clearTimeout(timer);
      sub.unsubscribe();
      resolve(JSON.parse(msg.body));
    });
  });
}

// Collects every message on a destination into an array instead of resolving once,
// so we can assert about absence (e.g. "no LEAVE arrived") over a window of time.
function collectMessages(destination, client) {
  const messages = [];
  const sub = client.subscribe(destination, (msg) => messages.push(JSON.parse(msg.body)));
  return { messages, unsubscribe: () => sub.unsubscribe() };
}

function publishJoin(client, roomId, userId) {
  client.publish({
    destination: '/app/join',
    body: JSON.stringify({ type: 'JOIN', roomId, senderId: userId, payload: { userId } }),
  });
}

function publishLeave(client, roomId, userId) {
  client.publish({
    destination: '/app/leave',
    body: JSON.stringify({ type: 'LEAVE', roomId, senderId: userId, payload: { userId } }),
  });
}

// ---------------------------------------------------------------------------
// Suite 1: Two clients join the same room -> both get peer-joined
// ---------------------------------------------------------------------------
async function testJoinBroadcast() {
  section('Suite 1: Two clients join same room -> both get peer-joined');
  const roomId = uid('room-join');
  const userA = uid('userA');
  const userB = uid('userB');

  const clientA = makeClient(userA);
  const clientB = makeClient(userB);
  await connect(clientA);
  await connect(clientB);

  log('User A joins first, gets its own ROOM_STATE');
  const aState = waitForMessage('/user/queue/signaling', clientA);
  publishJoin(clientA, roomId, userA);
  const stateA = await aState;
  check('User A received ROOM_STATE containing itself', stateA.type === 'ROOM_STATE'
    && stateA.payload.some((p) => p.userId === userA));

  await sleep(300);

  log('User B joins, User A should be notified in the room topic');
  const aSeesJoin = waitForMessage(`/topic/rooms/${roomId}`, clientA);
  const bState = waitForMessage('/user/queue/signaling', clientB);
  publishJoin(clientB, roomId, userB);
  const [joinNotice, stateB] = await Promise.all([aSeesJoin, bState]);

  check('User A was notified that User B joined (peer-joined)', joinNotice.type === 'JOIN'
    && joinNotice.senderId === userB);
  check('User B received ROOM_STATE listing both participants', stateB.type === 'ROOM_STATE'
    && stateB.payload.length === 2
    && stateB.payload.some((p) => p.userId === userA)
    && stateB.payload.some((p) => p.userId === userB));

  publishLeave(clientA, roomId, userA);
  publishLeave(clientB, roomId, userB);
  await sleep(300);
  clientA.deactivate();
  clientB.deactivate();
}

// ---------------------------------------------------------------------------
// Suite 2: Room isolation -> messages in one room never leak to another
// ---------------------------------------------------------------------------
async function testRoomIsolation() {
  section('Suite 2: Room isolation');
  const room1 = uid('room-iso-1');
  const room2 = uid('room-iso-2');
  const user1 = uid('user1');
  const user2 = uid('user2');
  const user3 = uid('user3');
  const user4 = uid('user4');

  const client1 = makeClient(user1); // room 1
  const client2 = makeClient(user2); // room 1
  const client3 = makeClient(user3); // room 2 (bystander watching for leaks)
  const client4 = makeClient(user4); // room 2

  await Promise.all([connect(client1), connect(client2), connect(client3), connect(client4)]);

  // client3 legitimately subscribes to room2's own topic (it just never sends /app/join) --
  // this is a control to prove pub/sub works, NOT a leak check by itself, since it WILL
  // legitimately receive room2's own broadcasts (join status doesn't gate topic subscriptions).
  const room2Traffic = collectMessages(`/topic/rooms/${room2}`, client3);

  // A genuine eavesdropper on room1's topic, run from a client that never touches room1 at all
  // via /app/join. Real leak = anything from room2 (user3/user4) showing up here.
  const room1Traffic = collectMessages(`/topic/rooms/${room1}`, client4);

  log('User 4 joins Room 2 (should be unaffected by Room 1 activity)');
  const state4 = waitForMessage('/user/queue/signaling', client4);
  publishJoin(client4, room2, user4);
  await state4;

  log('User 1 and User 2 join and exchange signaling in Room 1');
  const state1 = waitForMessage('/user/queue/signaling', client1);
  publishJoin(client1, room1, user1);
  await state1;
  await sleep(200);

  const state2 = waitForMessage('/user/queue/signaling', client2);
  publishJoin(client2, room1, user2);
  await state2;

  const user2GetsOffer = waitForMessage('/user/queue/signaling', client2);
  client1.publish({
    destination: '/app/offer',
    body: JSON.stringify({
      type: 'OFFER', roomId: room1, senderId: user1, targetId: user2,
      payload: { sdp: 'v=0\r\no=- ISO-TEST-OFFER\r\n...' },
    }),
  });
  await user2GetsOffer;
  await sleep(300);

  const room1Users = new Set([user1, user2]);
  const room2Users = new Set([user3, user4]);

  check('User 3 (Room 2 topic) received room2\'s own JOIN broadcast (sanity check pub/sub works)',
    room2Traffic.messages.some((m) => m.senderId === user4));
  check('User 3 (Room 2 topic) never received any Room 1 traffic (no cross-room leak)',
    !room2Traffic.messages.some((m) => room1Users.has(m.senderId)));
  check('User 4 (subscribed to Room 1\'s topic) never received Room 2 traffic there',
    !room1Traffic.messages.some((m) => room2Users.has(m.senderId)));
  check('The private OFFER never appeared on Room 1\'s public topic either',
    !room1Traffic.messages.some((m) => m.type === 'OFFER'));

  room2Traffic.unsubscribe();
  room1Traffic.unsubscribe();

  publishLeave(client1, room1, user1);
  publishLeave(client2, room1, user2);
  publishLeave(client4, room2, user4);
  await sleep(300);
  [client1, client2, client3, client4].forEach((c) => c.deactivate());
  await sleep(200);
}

// ---------------------------------------------------------------------------
// Suite 3: Disconnect (no LEAVE sent) -> peer-left after grace period
// ---------------------------------------------------------------------------
async function testDisconnectPeerLeft() {
  section('Suite 3: Disconnect -> peer-left');
  const roomId = uid('room-disc');
  const userA = uid('userA');
  const userB = uid('userB');

  const clientA = makeClient(userA);
  const clientB = makeClient(userB);
  await connect(clientA);
  await connect(clientB);

  const stateA = waitForMessage('/user/queue/signaling', clientA);
  publishJoin(clientA, roomId, userA);
  await stateA;
  await sleep(200);

  const stateB = waitForMessage('/user/queue/signaling', clientB);
  const aSeesJoin = waitForMessage(`/topic/rooms/${roomId}`, clientA);
  publishJoin(clientB, roomId, userB);
  await Promise.all([stateB, aSeesJoin]);

  log(`User B disconnects abruptly (no /app/leave) -- waiting out the grace period (assuming <= ${GRACE_PERIOD_MS}ms)`);
  const disconnectedAt = Date.now();
  const aSeesLeave = waitForMessage(`/topic/rooms/${roomId}`, clientA, GRACE_PERIOD_MS + 3000);
  clientB.deactivate(); // hard close, does not send /app/leave

  try {
    const leaveMsg = await aSeesLeave;
    measuredGracePeriodMs = Date.now() - disconnectedAt;
    log(`(measured LEAVE arrival at ~${measuredGracePeriodMs}ms after disconnect)`);
    check('User A received a LEAVE broadcast after User B disconnected (peer-left)', leaveMsg.type === 'LEAVE'
      && leaveMsg.senderId === userB);
  } catch (e) {
    check('User A received a LEAVE broadcast after User B disconnected (peer-left)', false);
    console.log('    (Only fires if WebSocketEventListener / SignalingRoomService.handleSessionDisconnect '
      + 'is wired up and GRACE_PERIOD_MS in this file matches websocket.reconnect.grace-period-ms)');
  }

  publishLeave(clientA, roomId, userA);
  await sleep(300);
  clientA.deactivate();
}

// ---------------------------------------------------------------------------
// Suite 4: Reconnect within grace period -> rejoin state, no LEAVE fired
// ---------------------------------------------------------------------------
async function testReconnectWithinGracePeriod() {
  section('Suite 4: Reconnect within grace period -> rejoin');
  const roomId = uid('room-reconnect');
  const userA = uid('userA');
  const userB = uid('userB'); // the one who will drop and rejoin

  const clientA = makeClient(userA);
  let clientB = makeClient(userB);
  await connect(clientA);
  await connect(clientB);

  const stateA = waitForMessage('/user/queue/signaling', clientA);
  publishJoin(clientA, roomId, userA);
  await stateA;
  await sleep(200);

  const stateB = waitForMessage('/user/queue/signaling', clientB);
  const aSeesJoin = waitForMessage(`/topic/rooms/${roomId}`, clientA);
  publishJoin(clientB, roomId, userB);
  await Promise.all([stateB, aSeesJoin]);

  const effectiveGraceMs = measuredGracePeriodMs || GRACE_PERIOD_MS;
  if (measuredGracePeriodMs) {
    log(`Using grace period measured from Suite 3 (~${measuredGracePeriodMs}ms) instead of the ${GRACE_PERIOD_MS}ms guess`);
  } else {
    log(`Suite 3 measurement unavailable (run standalone?) -- falling back to GRACE_PERIOD_MS = ${GRACE_PERIOD_MS}ms guess`);
  }

  log('Watching Room topic on User A while User B drops and reconnects quickly');
  const watcher = collectMessages(`/topic/rooms/${roomId}`, clientA);

  const reconnectDelayMs = Math.max(200, Math.floor(effectiveGraceMs / 3));
  clientB.deactivate(); // abrupt drop, no /app/leave
  await sleep(reconnectDelayMs);

  check(`No LEAVE broadcast within the grace period window (waited ${reconnectDelayMs}ms of ~${effectiveGraceMs}ms)`,
    !watcher.messages.some((m) => m.type === 'LEAVE'));

  log('User B reconnects with the same userId before the grace period expires');
  clientB = makeClient(userB);
  await connect(clientB);
  const rejoinState = waitForMessage('/user/queue/signaling', clientB);
  publishJoin(clientB, roomId, userB);
  const stateAfterRejoin = await rejoinState;

  check('Rejoining user received a fresh ROOM_STATE listing both participants',
    stateAfterRejoin.type === 'ROOM_STATE'
    && stateAfterRejoin.payload.length === 2
    && stateAfterRejoin.payload.some((p) => p.userId === userA)
    && stateAfterRejoin.payload.some((p) => p.userId === userB));

  // Give the (already-cancelled) grace timer time to prove it does NOT fire late.
  await sleep(effectiveGraceMs + 2000);
  check('No LEAVE was ever broadcast for the reconnecting user (grace timer was cancelled)',
    !watcher.messages.some((m) => m.type === 'LEAVE' && m.senderId === userB));
  check('User A saw a rejoin JOIN notice instead of a LEAVE for User B',
    watcher.messages.some((m) => m.type === 'JOIN' && m.senderId === userB));

  watcher.unsubscribe();
  publishLeave(clientA, roomId, userA);
  publishLeave(clientB, roomId, userB);
  await sleep(300);
  clientA.deactivate();
  clientB.deactivate();
}

// ---------------------------------------------------------------------------
// Suite 5: Full relay flow -> OFFER/ANSWER/ICE stay private, ERROR path, cleanup
// ---------------------------------------------------------------------------
async function testFullRelayFlow() {
  section('Suite 5: Full signaling relay flow');
  const roomId = uid('room-flow');
  const userA = uid('userA');
  const userB = uid('userB');

  const clientA = makeClient(userA);
  const clientB = makeClient(userB);
  await connect(clientA);
  await connect(clientB);
  check('Both clients connected', clientA.connected && clientB.connected);

  log('User A sends JOIN');
  const aRoomState = waitForMessage('/user/queue/signaling', clientA);
  publishJoin(clientA, roomId, userA);
  const stateAfterA = await aRoomState;
  check('User A received ROOM_STATE with itself listed', stateAfterA.type === 'ROOM_STATE'
    && stateAfterA.payload.some((p) => p.userId === userA));
  await sleep(300);

  log('User B sends JOIN');
  const bRoomState = waitForMessage('/user/queue/signaling', clientB);
  const aSeesJoin = waitForMessage(`/topic/rooms/${roomId}`, clientA);
  publishJoin(clientB, roomId, userB);
  const [stateAfterB, aJoinNotice] = await Promise.all([bRoomState, aSeesJoin]);
  check('User B received ROOM_STATE listing both participants', stateAfterB.type === 'ROOM_STATE'
    && stateAfterB.payload.length === 2);
  check('User A was notified in the room topic that User B joined', aJoinNotice.type === 'JOIN'
    && aJoinNotice.senderId === userB);

  log('User A sends OFFER targeted at User B (must NOT broadcast)');
  const bGetsOffer = waitForMessage('/user/queue/signaling', clientB);
  let roomBroadcastLeaked = false;
  const leakWatcher = clientA.subscribe(`/topic/rooms/${roomId}`, (msg) => {
    if (JSON.parse(msg.body).type === 'OFFER') roomBroadcastLeaked = true;
  });
  clientA.publish({
    destination: '/app/offer',
    body: JSON.stringify({
      type: 'OFFER', roomId, senderId: userA, targetId: userB,
      payload: { sdp: 'v=0\r\no=- FAKE-SDP-OFFER\r\n...' },
    }),
  });
  const offerReceived = await bGetsOffer;
  await sleep(300);
  leakWatcher.unsubscribe();
  check('User B received the OFFER on its private queue', offerReceived.type === 'OFFER'
    && offerReceived.senderId === userA && !!offerReceived.payload.sdp);
  check('OFFER was NOT broadcast to the room topic', !roomBroadcastLeaked);

  log('User B sends ANSWER back to User A (must NOT broadcast)');
  const aGetsAnswer = waitForMessage('/user/queue/signaling', clientA);
  clientB.publish({
    destination: '/app/answer',
    body: JSON.stringify({
      type: 'ANSWER', roomId, senderId: userB, targetId: userA,
      payload: { sdp: 'v=0\r\no=- FAKE-SDP-ANSWER\r\n...' },
    }),
  });
  const answerReceived = await aGetsAnswer;
  check('User A received the ANSWER on its private queue', answerReceived.type === 'ANSWER'
    && answerReceived.senderId === userB && !!answerReceived.payload.sdp);

  log('Exchange ICE candidates both directions');
  const bGetsIce = waitForMessage('/user/queue/signaling', clientB);
  clientA.publish({
    destination: '/app/ice',
    body: JSON.stringify({
      type: 'ICE_CANDIDATE', roomId, senderId: userA, targetId: userB,
      payload: { candidate: 'candidate:1 1 UDP 2122260223 192.168.1.5 54321 typ host', sdpMid: '0', sdpMLineIndex: 0 },
    }),
  });
  const iceAtB = await bGetsIce;
  check('User B received ICE candidate from User A', iceAtB.type === 'ICE_CANDIDATE' && iceAtB.senderId === userA);

  const aGetsIce = waitForMessage('/user/queue/signaling', clientA);
  clientB.publish({
    destination: '/app/ice',
    body: JSON.stringify({
      type: 'ICE_CANDIDATE', roomId, senderId: userB, targetId: userA,
      payload: { candidate: 'candidate:2 1 UDP 2122260223 192.168.1.9 54322 typ host', sdpMid: '0', sdpMLineIndex: 0 },
    }),
  });
  const iceAtA = await aGetsIce;
  check('User A received ICE candidate from User B', iceAtA.type === 'ICE_CANDIDATE' && iceAtA.senderId === userB);

  log('Sending OFFER to a target that is not in the room (error path)');
  const aGetsError = waitForMessage('/user/queue/signaling', clientA);
  clientA.publish({
    destination: '/app/offer',
    body: JSON.stringify({
      type: 'OFFER', roomId, senderId: userA, targetId: 'ghost-user-does-not-exist',
      payload: { sdp: 'irrelevant' },
    }),
  });
  const errorMsg = await aGetsError;
  check('Server sent an ERROR message back for missing target', errorMsg.type === 'ERROR');

  log('Cleanup: both users leave explicitly (room should self-delete once empty)');
  publishLeave(clientA, roomId, userA);
  publishLeave(clientB, roomId, userB);
  await sleep(300);
  clientA.deactivate();
  clientB.deactivate();
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
async function run() {
  const suites = [
    testJoinBroadcast,
    testRoomIsolation,
    testDisconnectPeerLeft,
    testReconnectWithinGracePeriod,
    testFullRelayFlow,
  ];

  for (const suite of suites) {
    try {
      await suite();
    } catch (err) {
      fail++;
      console.error(`\n\x1b[31mSuite crashed:\x1b[0m ${suite.name}: ${err.message}`);
    }
  }

  console.log(`\n\x1b[1m${pass} passed, ${fail} failed\x1b[0m out of ${pass + fail} checks.`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
