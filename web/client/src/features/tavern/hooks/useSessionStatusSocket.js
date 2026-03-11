import { useEffect, useRef, useState } from "react";
import { WS_URL } from "../constants/tavernConstants.js";

export function useSessionStatusSocket() {
  const wsRef = useRef(null);

  const [sessionActive, setSessionActive] = useState(false);
  const [gotSession, setGotSession] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onerror = () => {
      ws.close();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg?.type !== "session") {
          return;
        }

        setGotSession(true);
        setSessionActive(!!msg.active);
      } catch {
        // ignore invalid/non-json messages
      }
    };

    return () => {
      wsRef.current = null;
      ws.close();
    };
  }, []);

  const sendRaw = (payload) => {
    const ws = wsRef.current;

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    ws.send(JSON.stringify(payload));
    return true;
  };

  return {
    gotSession,
    sessionActive,
    sendRaw,
  };
}