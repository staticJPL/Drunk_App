import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Grid,
  HStack,
  Text,
  VStack,
  Separator,
} from "@chakra-ui/react";

import {
  makeAdvanceTurnMessage,
  makeAdminEndSessionMessage,
  makeAdminRemoveSeatMessage,
  makeTokenMessage,
} from "../protocol/commands.js";
import { getOrCreateClientToken } from "../protocol/clientToken.js";
import { WS_URL, seatOrder } from "../constants/tavernConstants.js";

function SeatCard({ seatId, seat, isCurrent, onRemove }) {
  return (
    <Box
      bg="#2A170E"
      borderWidth="1px"
      borderColor={isCurrent ? "#28ADFA" : "rgba(255,255,255,0.12)"}
      borderRadius="md"
      p={3}
    >
      <VStack align="stretch" gap={2}>
        <Text color="#FAF1D9" fontWeight="bold">
          {seatId}
        </Text>

        <Text color="#E9D7B7">Occupied: {String(!!seat?.occupied)}</Text>
        <Text color="#E9D7B7">Name: {seat?.name || "—"}</Text>
        <Text color="#E9D7B7">Connected: {String(!!seat?.connected)}</Text>
        <Text color="#E9D7B7">Readings: {seat?.readingCount ?? 0}</Text>
        <Text color="#E9D7B7">BAC: {seat?.lastBAC ?? "—"}</Text>

        <Button
          size="sm"
          onClick={() => onRemove(seatId)}
          isDisabled={!seat?.occupied}
        >
          Remove From Seat
        </Button>
      </VStack>
    </Box>
  );
}

export default function AdminTavern() {
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const clientTokenRef = useRef(getOrCreateClientToken());

  const [status, setStatus] = useState("connecting");
  const [tavernState, setTavernState] = useState(null);
  const [lastMsg, setLastMsg] = useState(null);

  const seats = tavernState?.seats ?? {};
  const currentTurnSeatId = tavernState?.currentTurnSeatId ?? null;
  const sessionActive = !!tavernState?.sessionActive;

  const occupiedCount = useMemo(() => {
    return Object.values(seats).filter((seat) => seat?.occupied).length;
  }, [seats]);

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
          setLastMsg(msg);

          if (msg?.type === "tavern_state") {
            setTavernState(msg);
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
  }, []);

  const sendWs = (payload) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    ws.send(JSON.stringify(payload));
  };

  return (
    <Flex minH="100vh" bg="#2B1D14" p={6} direction="column" gap={5}>
      <Text color="#FAF1D9" fontSize="2xl" fontWeight="bold">
        Tavern Admin
      </Text>

      <Box
        bg="#3B2416"
        borderWidth="1px"
        borderColor="rgba(255,255,255,0.12)"
        borderRadius="lg"
        p={4}
      >
        <VStack align="stretch" gap={3}>
          <Text color="#FAF1D9">Socket: {status}</Text>
          <Text color="#FAF1D9">Session Active: {String(sessionActive)}</Text>
          <Text color="#FAF1D9">
            Current Turn Seat: {currentTurnSeatId ?? "—"}
          </Text>
          <Text color="#FAF1D9">Occupied Seats: {occupiedCount}</Text>

          <Separator borderColor="rgba(255,255,255,0.12)" />

          <HStack wrap="wrap">
            <Button onClick={() => sendWs(makeAdvanceTurnMessage())}>
              Force Advance Turn
            </Button>

            <Button
              onClick={() => sendWs(makeAdminEndSessionMessage())}
              bg="#8B2E24"
              color="#FAF1D9"
              _hover={{ bg: "#A3362A" }}
              _active={{ bg: "#6E241C" }}
            >
              End Session
            </Button>
          </HStack>
        </VStack>
      </Box>

      <Grid templateColumns="repeat(3, minmax(0, 1fr))" gap={4}>
        {seatOrder.map((seatId) => (
          <SeatCard
            key={seatId}
            seatId={seatId}
            seat={seats[seatId]}
            isCurrent={currentTurnSeatId === seatId}
            onRemove={(id) => sendWs(makeAdminRemoveSeatMessage(id))}
          />
        ))}
      </Grid>

      <Box
        bg="#3B2416"
        borderWidth="1px"
        borderColor="rgba(255,255,255,0.12)"
        borderRadius="lg"
        p={4}
      >
        <Text color="#FAF1D9" fontWeight="bold" mb={2}>
          Last Message
        </Text>

        <Box
          bg="#2A170E"
          borderRadius="md"
          p={3}
          color="#FAF1D9"
          fontSize="sm"
          fontFamily="mono"
          whiteSpace="pre-wrap"
        >
          {lastMsg ? JSON.stringify(lastMsg, null, 2) : "—"}
        </Box>
      </Box>
    </Flex>
  );
}