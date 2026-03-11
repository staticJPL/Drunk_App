"use strict";

function createHttpHandler({ state, wss }) {
  return function handleHttp(req, res) {
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          clients: wss.clients.size,
          browserSessions: state.browserSessions.size,
          hasSnapshot: !!state.latestSnapshotText,
          currentTurnSeatId: state.currentTurnSeatId,
        })
      );
      return;
    }

    res.writeHead(404);
    res.end("not found");
  };
}

module.exports = {
  createHttpHandler,
};