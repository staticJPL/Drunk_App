"use strict";

const {
  isValidIdentity,
  isValidTokenMsg,
  isValidSessionMsg,
  isValidSnapshot,
  isValidClaimSeatMsg,
  isValidLeaveSeatMsg,
  isValidRenameSelfMsg,
  isValidAdvanceTurnMsg,
  isValidAdminRemoveSeatMsg,
  isValidSimulateSnapshotMsg,
  isValidAdminEndSessionMsg,
} = require("../validators");

const {
  isKnownSeatId,
  getSessionBySocket,
  advanceTurn,
  clearSeatOwnership,
  bindSessionToSeat,
  syncSeatConnectionFromSession,
  applyAnalyzedSnapshotToCurrentSeat,
  removeSeatByAdmin,
  resetEntireSessionState,
} = require("../domain/tavern");
const { BreathAnalyzerState } = require("../constants");

function handleDeviceIdentity(ctx, ws, msg) {
  if (msg.clientId !== 0) {
    return false;
  }

  ws.clientId = 0;
  ws.clientToken = null;
  ws.playerName = null;
  ws.seatId = null;

  console.log("[ws] Breath Analyzer device identified as clientId=0");
  return true;
}

function handleTokenBinding(ctx, ws, msg) {
  const { state, transport } = ctx;
  const token = msg.clientToken;

  let session = state.browserSessions.get(token);

  if (session) {
    session.ws = ws;
    session.connected = true;

    transport.syncSocketFromSession(ws, session);
    syncSeatConnectionFromSession(state, session);

    console.log(
      `[ws] re-established browser session clientId=${ws.clientId} token=${ws.clientToken} seatId=${ws.seatId}`
    );
  } else {
    session = {
      clientId: state.nextClientId++,
      clientToken: token,
      seatId: null,
      playerName: null,
      ws,
      connected: true,
    };

    state.browserSessions.set(token, session);
    transport.syncSocketFromSession(ws, session);

    console.log(
      `[ws] created browser session clientId=${ws.clientId} token=${ws.clientToken}`
    );
  }

  transport.sendSessionBoundState(ws, session);
  transport.sendCurrentState(ws);
  transport.broadcastTavernState();
  return true;
}

function handleSessionToggle(ctx, msg) {
  const { state, transport } = ctx;
  state.sessionActive = msg.active;
  transport.broadcastWebClientsObj({ type: "session", active: state.sessionActive });
  transport.broadcastTavernState();
  return true;
}

function handleDeviceSnapshot(ctx, ws, msg, rawText) {
  const { state, transport } = ctx;

  if (ws.clientId !== 0) {
    console.log("[ws] rejected snapshot from non-device client");
    return true;
  }

  state.latestSnapshotText = rawText;
  console.log("[ws] successfully ack device snapshot:", msg);

  transport.broadcastWebClientsObj(msg);

  if (msg.state === BreathAnalyzerState.Analyzed) {
    applyAnalyzedSnapshotToCurrentSeat(state, msg);
    advanceTurn(state);
    transport.broadcastTavernState();
  }

  return true;
}

function handleClaimSeat(ctx, ws, session, msg) {
  const { state, transport } = ctx;
  const { seatId, name } = msg;
  const trimmedName = name.trim();

  if (!isKnownSeatId(state, seatId)) {
    transport.sendToSocket(ws, { type: "error", message: "Invalid seatId" });
    return true;
  }

  if (!trimmedName) {
    transport.sendToSocket(ws, { type: "error", message: "Name cannot be empty" });
    return true;
  }

  const targetSeat = state.tavernSeats[seatId];

  if (targetSeat.occupied && targetSeat.clientToken !== session.clientToken) {
    transport.sendToSocket(ws, { type: "error", message: "Seat already taken" });
    return true;
  }

  bindSessionToSeat(state, session, seatId, trimmedName);
  transport.syncSocketFromSession(ws, session);

  console.log(
    `[ws] claim_seat clientId=${session.clientId} seatId=${session.seatId} name=${session.playerName}`
  );

  transport.sendSessionBoundState(ws, session);
  transport.broadcastTavernState();
  return true;
}

function handleLeaveSeat(ctx, ws, session) {
  const { state, transport } = ctx;

  if (!session.seatId) {
    transport.sendToSocket(ws, { type: "error", message: "No claimed seat to leave" });
    return true;
  }

  const oldSeatId = session.seatId;
  clearSeatOwnership(state, oldSeatId);

  session.seatId = null;
  session.playerName = null;
  transport.syncSocketFromSession(ws, session);

  console.log(
    `[ws] leave_seat clientId=${session.clientId} seatId=${oldSeatId}`
  );

  transport.sendSessionBoundState(ws, session);
  transport.broadcastTavernState();
  return true;
}

function handleRenameSelf(ctx, ws, session, msg) {
  const { state, transport } = ctx;
  const trimmedName = msg.name.trim();

  if (!session.seatId) {
    transport.sendToSocket(ws, { type: "error", message: "No claimed seat to rename" });
    return true;
  }

  if (!trimmedName) {
    transport.sendToSocket(ws, { type: "error", message: "Name cannot be empty" });
    return true;
  }

  session.playerName = trimmedName;
  ws.playerName = trimmedName;

  const seat = state.tavernSeats[session.seatId];
  if (seat && seat.clientToken === session.clientToken) {
    seat.name = trimmedName;
  }

  console.log(
    `[ws] rename_self clientId=${session.clientId} seatId=${session.seatId} name=${trimmedName}`
  );

  transport.sendSessionBoundState(ws, session);
  transport.broadcastTavernState();
  return true;
}

function handleAdvanceTurn(ctx) {
  const { state, transport } = ctx;
  advanceTurn(state);
  transport.broadcastTavernState();
  return true;
}

function handleAdminRemoveSeat(ctx, msg) {
  const { state, transport } = ctx;

  if (!isKnownSeatId(state, msg.seatId)) {
    return false;
  }

  removeSeatByAdmin(state, msg.seatId);
  transport.syncBoundSessionSockets();
  transport.broadcastTavernState();
  return true;
}

function handleSimulatedSnapshot(ctx, msg) {
  const { state, transport } = ctx;

  const snapshot = {
    state: msg.state,
    t_us: msg.t_us,
    voltage: msg.voltage,
    ppm: msg.ppm,
    bac: msg.bac,
  };

  state.latestSnapshotText = JSON.stringify(snapshot);
  transport.broadcastWebClientsObj(snapshot);

  if (msg.state === 5) {
    applyAnalyzedSnapshotToCurrentSeat(state, msg);
    advanceTurn(state);
    transport.broadcastTavernState();
  }

  return true;
}

function handleAdminEndSession(ctx) {
  const { state, transport } = ctx;

  console.log("[ws] admin_end_session requested");
  resetEntireSessionState(state);
  transport.syncBoundSessionSockets();
  transport.broadcastWebClientsObj({ type: "session", active: false });
  transport.broadcastTavernState();
  return true;
}

function handleMessage(ctx, ws, rawText) {
  let msg;

  try {
    msg = JSON.parse(rawText);
  } catch (err) {
    console.log("[ws] invalid json data:", err.message);
    return;
  }

  if (isValidIdentity(msg) && handleDeviceIdentity(ctx, ws, msg)) {
    return;
  }

  if (isValidTokenMsg(msg) && handleTokenBinding(ctx, ws, msg)) {
    return;
  }

  if (isValidSessionMsg(msg) && handleSessionToggle(ctx, msg)) {
    return;
  }

  if (isValidSnapshot(msg) && handleDeviceSnapshot(ctx, ws, msg, rawText)) {
    return;
  }

  const session = getSessionBySocket(ctx.state, ws);
  if (!session) {
    console.log("[ws] rejected browser command before token binding:", msg);
    return;
  }

  if (isValidClaimSeatMsg(msg) && handleClaimSeat(ctx, ws, session, msg)) {
    return;
  }

  if (isValidLeaveSeatMsg(msg) && handleLeaveSeat(ctx, ws, session)) {
    return;
  }

  if (isValidRenameSelfMsg(msg) && handleRenameSelf(ctx, ws, session, msg)) {
    return;
  }

  if (isValidAdvanceTurnMsg(msg) && handleAdvanceTurn(ctx)) {
    return;
  }

  if (isValidAdminRemoveSeatMsg(msg)) {
    if (!isKnownSeatId(ctx.state, msg.seatId)) {
      ctx.transport.sendToSocket(ws, { type: "error", message: "Invalid seatId" });
      return;
    }

    handleAdminRemoveSeat(ctx, msg);
    return;
  }

  if (isValidSimulateSnapshotMsg(msg) && handleSimulatedSnapshot(ctx, msg)) {
    return;
  }

  if (isValidAdminEndSessionMsg(msg) && handleAdminEndSession(ctx)) {
    return;
  }

  console.log("[ws] unhandled message:", msg);
}

function handleClose(ctx, ws, code, reason) {
  const { state, transport } = ctx;

  if (ws.clientToken) {
    const session = state.browserSessions.get(ws.clientToken);

    if (session && session.ws === ws) {
      session.ws = null;
      session.connected = false;
      syncSeatConnectionFromSession(state, session);
    }
  }

  console.log(
    "[ws] client disconnected",
    code,
    reason?.toString?.() ?? "",
    `clientId=${ws.clientId}`,
    `token=${ws.clientToken ?? "none"}`
  );

  transport.broadcastTavernState();
}

function handleError(ws, err) {
  console.log("[ws] client error:", err.message);
}

module.exports = {
  handleMessage,
  handleClose,
  handleError,
};