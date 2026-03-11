"use strict";

function createEmptySeat(seatId) {
  return {
    seatId,
    occupied: false,
    ownerClientId: null,
    clientToken: null,
    name: "",
    connected: false,
    readingCount: 0,
    lastBAC: null,
    lastPPM: null,
    lastVoltage: null,
    lastReadingAtUs: null,
  };
}

function createTavernSeats(seatOrder) {
  return Object.fromEntries(seatOrder.map((seatId) => [seatId, createEmptySeat(seatId)]));
}

function resetSeat(seat) {
  seat.occupied = false;
  seat.ownerClientId = null;
  seat.clientToken = null;
  seat.name = "";
  seat.connected = false;
  seat.readingCount = 0;
  seat.lastBAC = null;
  seat.lastPPM = null;
  seat.lastVoltage = null;
  seat.lastReadingAtUs = null;
}

function createServerState(seatOrder) {
  return {
    latestSnapshotText: null,
    sessionActive: false,
    nextClientId: 1,
    currentTurnSeatId: null,
    browserSessions: new Map(),
    tavernSeats: createTavernSeats(seatOrder),
  };
}

module.exports = {
  createEmptySeat,
  createTavernSeats,
  resetSeat,
  createServerState,
};