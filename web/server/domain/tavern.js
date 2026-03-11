"use strict";

const { seatOrder } = require("../constants");
const { resetSeat } = require("../state");

function isKnownSeatId(state, seatId) {
  return typeof seatId === "string" && Object.hasOwn(state.tavernSeats, seatId);
}

function hasOccupiedSeat(state, seatId) {
  return isKnownSeatId(state, seatId) && state.tavernSeats[seatId].occupied;
}

function getSessionBySocket(state, ws) {
  if (!ws?.clientToken) {
    return null;
  }

  return state.browserSessions.get(ws.clientToken) ?? null;
}

function buildTavernState(state) {
  return {
    type: "tavern_state",
    sessionActive: state.sessionActive,
    currentTurnSeatId: state.currentTurnSeatId,
    seats: state.tavernSeats,
  };
}

function advanceTurn(state) {
  const occupiedSeatIds = seatOrder.filter((seatId) => state.tavernSeats[seatId].occupied);

  if (occupiedSeatIds.length === 0) {
    state.currentTurnSeatId = null;
    return;
  }

  if (
    !state.currentTurnSeatId ||
    !occupiedSeatIds.includes(state.currentTurnSeatId)
  ) {
    state.currentTurnSeatId = occupiedSeatIds[0];
    return;
  }

  const currentIndex = occupiedSeatIds.indexOf(state.currentTurnSeatId);
  state.currentTurnSeatId = occupiedSeatIds[(currentIndex + 1) % occupiedSeatIds.length];
}

function clearSeatOwnership(state, seatId) {
  if (!isKnownSeatId(state, seatId)) {
    return;
  }

  const seat = state.tavernSeats[seatId];
  resetSeat(seat);

  if (state.currentTurnSeatId === seatId) {
    state.currentTurnSeatId = null;
    advanceTurn(state);
  }
}

function bindSessionToSeat(state, session, seatId, playerName) {
  const trimmedName = playerName.trim();

  if (session.seatId && session.seatId !== seatId) {
    clearSeatOwnership(state, session.seatId);
  }

  const seat = state.tavernSeats[seatId];
  seat.occupied = true;
  seat.ownerClientId = session.clientId;
  seat.clientToken = session.clientToken;
  seat.name = trimmedName;
  seat.connected = true;

  session.seatId = seatId;
  session.playerName = trimmedName;

  if (!hasOccupiedSeat(state, state.currentTurnSeatId)) {
    advanceTurn(state);
  }
}

function syncSeatConnectionFromSession(state, session) {
  if (!session?.seatId) {
    return;
  }

  if (!isKnownSeatId(state, session.seatId)) {
    return;
  }

  const seat = state.tavernSeats[session.seatId];

  if (seat.clientToken !== session.clientToken) {
    return;
  }

  seat.connected = session.connected;
  seat.ownerClientId = session.clientId;
  seat.name = session.playerName ?? seat.name;
}

function applyAnalyzedSnapshotToCurrentSeat(state, snapshot) {
  if (!state.currentTurnSeatId) {
    console.log("[ws] analyzed snapshot received but no current turn seat is set");
    return;
  }

  if (!isKnownSeatId(state, state.currentTurnSeatId)) {
    console.log("[ws] analyzed snapshot received but current turn seat is invalid");
    return;
  }

  const seat = state.tavernSeats[state.currentTurnSeatId];

  if (!seat.occupied) {
    console.log("[ws] analyzed snapshot received but current turn seat is not occupied");
    return;
  }

  seat.readingCount += 1;
  seat.lastBAC = typeof snapshot.bac === "number" ? snapshot.bac : null;
  seat.lastPPM = typeof snapshot.ppm === "number" ? snapshot.ppm : null;
  seat.lastVoltage = typeof snapshot.voltage === "number" ? snapshot.voltage : null;
  seat.lastReadingAtUs = typeof snapshot.t_us === "number" ? snapshot.t_us : null;

  console.log(
    `[ws] applied analyzed snapshot to seat=${state.currentTurnSeatId} bac=${seat.lastBAC}`
  );
}

function removeSeatByAdmin(state, seatId) {
  if (!isKnownSeatId(state, seatId)) {
    return false;
  }

  const seat = state.tavernSeats[seatId];
  const clientToken = seat.clientToken;

  clearSeatOwnership(state, seatId);

  if (clientToken) {
    const session = state.browserSessions.get(clientToken);
    if (session) {
      session.seatId = null;
      session.playerName = null;
    }
  }

  return true;
}

function resetEntireSessionState(state) {
  state.sessionActive = false;
  state.latestSnapshotText = null;
  state.currentTurnSeatId = null;

  for (const seatId of seatOrder) {
    resetSeat(state.tavernSeats[seatId]);
  }

  for (const session of state.browserSessions.values()) {
    session.seatId = null;
    session.playerName = null;
  }
}

module.exports = {
  isKnownSeatId,
  hasOccupiedSeat,
  getSessionBySocket,
  buildTavernState,
  advanceTurn,
  clearSeatOwnership,
  bindSessionToSeat,
  syncSeatConnectionFromSession,
  applyAnalyzedSnapshotToCurrentSeat,
  removeSeatByAdmin,
  resetEntireSessionState,
};