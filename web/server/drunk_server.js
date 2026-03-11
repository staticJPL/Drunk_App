"use strict";

const http = require("http");
const WebSocket = require("ws");

const { PORT, seatOrder } = require("./constants");
const { createServerState } = require("./state");
const { createTransport } = require("./transport");
const { createHttpHandler } = require("./handlers/http");
const { handleMessage, handleClose, handleError } = require("./handlers/socket");

const state = createServerState(seatOrder);

let wss = null;

const server = http.createServer((req, res) => {
  if (!wss) {
    res.writeHead(503);
    res.end("server not ready");
    return;
  }

  return createHttpHandler({ state, wss })(req, res);
});

wss = new WebSocket.Server({ server });

const transport = createTransport({ state, wss });
const ctx = { state, transport };

server.on("error", (err) => {
  console.error("[http] server error:", err);
  process.exit(1);
});

wss.on("connection", (ws) => {
  transport.initializeSocket(ws);

  console.log("[ws] client connected");
  transport.sendCurrentState(ws);

  ws.on("message", (msg) => {
    handleMessage(ctx, ws, msg.toString());
  });

  ws.on("error", (err) => {
    handleError(ws, err);
  });

  ws.on("close", (code, reason) => {
    handleClose(ctx, ws, code, reason);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`listening http + WebSocket on 0.0.0.0:${PORT}`);
});