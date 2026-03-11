import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { parseSnapshot } from "../protocol/breathSnapshot.js";
import { getOrCreateClientToken } from "../protocol/clientToken.js";
import { makeTokenMessage, makeSessionMessage } from "../protocol/commands.js";
import {
  WS_URL,
  createInitialSeats,
  seatOrder,
} from "../constants/tavernConstants.js";

export function useLiveTavernSocket() {
  const navigate = useNavigate();

  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const clientTokenRef = useRef(getOrCreateClientToken());

  const [status, setStatus] = useState("connecting");
  const [checkedSession, setCheckedSession] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [boundSession, setBoundSession] = useState(null);
  const [tavernSeats, setTavernSeats] = useState(() => createInitialSeats());
  const [currentTurnSeatId, setCurrentTurnSeatId] = useState(null);
  const [latestSnap, setLatestSnap] = useState(null);

  useEffect(() => {
    let alive = true;

    const connect = () => {
      if (!alive) {
        return;
      }

      setStatus("connecting");

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("open");
        ws.send(JSON.stringify(makeTokenMessage(clientTokenRef.current)));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          console.log("[live ws]", msg);

          if (msg?.type === "session") {
            setCheckedSession(true);
            setSessionActive(!!msg.active);

            if (!msg.active) {
              navigate("/", { replace: true });
            }
            return;
          }

          if (msg?.type === "bound_session") {
            setBoundSession(msg);
            return;
          }

          if (msg?.type === "tavern_state") {
            if (msg.seats && typeof msg.seats === "object") {
              setTavernSeats(msg.seats);
            }

            setCurrentTurnSeatId(msg.currentTurnSeatId ?? null);
            setSessionActive(!!msg.sessionActive);
            return;
          }

          const snapshot = parseSnapshot(msg);
          if (snapshot) {
            setLatestSnap(snapshot);
          }
        } catch {
          // ignore invalid/non-json messages
        }
      };

      ws.onclose = () => {
        setStatus("closed");

        if (alive) {
          reconnectTimerRef.current = setTimeout(connect, 500);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      alive = false;

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      wsRef.current?.close();
    };
  }, [navigate]);

  const sendWs = useCallback((payload) => {
    const ws = wsRef.current;

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.log("socket not open, cannot send:", payload);
      return false;
    }

    ws.send(JSON.stringify(payload));
    return true;
  }, []);

  const endSession = useCallback(() => {
    const ws = wsRef.current;

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(makeSessionMessage(false)));
    }

    navigate("/", { replace: true });
  }, [navigate]);

  const mySeatId = boundSession?.seatId ?? null;

  const drinkers = useMemo(() => {
    return seatOrder.map((seatId) => {
      const seat = tavernSeats[seatId];

      return {
        seatId,
        occupied: !!seat?.occupied,
        name: seat?.name ?? "",
        connected: !!seat?.connected,
        isMine: mySeatId === seatId,
        lastBAC: seat?.lastBAC ?? null,
        readingCount: seat?.readingCount ?? 0,
      };
    });
  }, [tavernSeats, mySeatId]);

  return {
    status,
    checkedSession,
    sessionActive,
    boundSession,
    tavernSeats,
    currentTurnSeatId,
    latestSnap,
    mySeatId,
    drinkers,
    sendWs,
    endSession,
  };
}