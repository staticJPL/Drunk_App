"use strict";

const WebSocket = require("ws");
const { buildTavernState } = require("./domain/tavern");

function createTransport({ state, wss }) {
  function sendToSocket(ws, obj) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    ws.send(JSON.stringify(obj));
  }

  function sendTextToSocket(ws, text) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    ws.send(text);
  }

  function initializeSocket(ws) {
    ws.clientId = null;
    ws.clientToken = null;
    ws.playerName = null;
    ws.seatId = null;
  }

  function syncSocketFromSession(ws, session) {
    ws.clientId = session.clientId;
    ws.clientToken = session.clientToken;
    ws.playerName = session.playerName;
    ws.seatId = session.seatId;
  }

  function clearSocketSessionFields(ws) {
    ws.clientToken = null;
    ws.playerName = null;
    ws.seatId = null;
  }

  function sendSessionBoundState(ws, session) {
    sendToSocket(ws, {
      type: "bound_session",
      clientId: session.clientId,
      seatId: session.seatId,
      playerName: session.playerName,
      connected: session.connected,
    });
  }

  function sendCurrentState(ws) {
    sendToSocket(ws, { type: "session", active: state.sessionActive });
    sendToSocket(ws, buildTavernState(state));

    if (state.latestSnapshotText) {
      sendTextToSocket(ws, state.latestSnapshotText);
    }
  }

  function broadcastWebClientsObj(obj) {
    const text = JSON.stringify(obj);

    for (const client of wss.clients) {
      if (client.readyState !== WebSocket.OPEN) {
        continue;
      }

      if (client.clientId === 0) {
        continue;
      }

      client.send(text);
    }
  }

  function broadcastTavernState() {
    broadcastWebClientsObj(buildTavernState(state));
  }

  function syncBoundSessionSockets() {
    for (const session of state.browserSessions.values()) {
      if (!session.ws) {
        continue;
      }

      syncSocketFromSession(session.ws, session);
      sendSessionBoundState(session.ws, session);
    }
  }

  return {
    sendToSocket,
    sendTextToSocket,
    initializeSocket,
    syncSocketFromSession,
    clearSocketSessionFields,
    sendSessionBoundState,
    sendCurrentState,
    broadcastWebClientsObj,
    broadcastTavernState,
    syncBoundSessionSockets,
  };
}

module.exports = {
  createTransport,
};