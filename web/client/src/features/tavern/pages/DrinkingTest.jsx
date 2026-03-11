import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Text,
  VStack,
  Separator,
} from "@chakra-ui/react";

import {
  makeAdvanceTurnMessage,
  makeClaimSeatMessage,
  makeLeaveSeatMessage,
  makeRenameSelfMessage,
  makeTokenMessage,
} from "../protocol/commands.js";
import { getOrCreateClientToken } from "../protocol/clientToken.js";
import {
  BreathState,
  getBreathStateLabel,
  parseSnapshot,
} from "../protocol/breathSnapshot.js";
import { WS_URL, createInitialSeats, seatOrder } from "../constants/tavernConstants.js";

const seatGroups = {
  top: ["top_1", "top_2"],
  bottom: ["bottom_1", "bottom_2"],
  left: ["left_1", "left_2", "left_3", "left_4"],
  right: ["right_1", "right_2", "right_3", "right_4"],
};

function SeatButton({ seatId, seat, isCurrent, isSelected, onClick }) {
  return (
    <Button
      size="sm"
      minW="104px"
      h="52px"
      borderWidth="2px"
      borderColor={isCurrent ? "#28adfa" : "#5C3A21"}
      bg={seat.occupied ? "#D6B98C" : "#E9D7B7"}
      color="#2A170E"
      _hover={{ bg: "#F3E5C6" }}
      onClick={() => onClick(seatId)}
      boxShadow={isSelected ? "0 0 0 3px rgba(255,255,255,0.25)" : "none"}
    >
      <VStack spacing={0}>
        <Text fontSize="xs" fontWeight="bold">
          {seatId}
        </Text>
        <Text fontSize="10px">
          {seat.occupied ? seat.name || "Occupied" : "Empty"}
        </Text>
      </VStack>
    </Button>
  );
}

function DebugRow({ label, value }) {
  return (
    <Flex justify="space-between" gap={4}>
      <Text color="#E9D7B7" fontWeight="semibold">
        {label}
      </Text>
      <Text color="#FAF1D9" textAlign="right">
        {value}
      </Text>
    </Flex>
  );
}

function SectionTitle({ children }) {
  return (
    <Text color="#E9D7B7" fontWeight="bold" fontSize="sm" letterSpacing="wide">
      {children}
    </Text>
  );
}

export default function DrinkingTest() {
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const clientTokenRef = useRef(getOrCreateClientToken());

  const [socketStatus, setSocketStatus] = useState("closed");
  const [selectedSeatId, setSelectedSeatId] = useState(null);
  const [currentTurnSeatId, setCurrentTurnSeatId] = useState(null);
  const [rawLastMessage, setRawLastMessage] = useState(null);
  const [latestSnapshot, setLatestSnapshot] = useState(null);
  const [sessionPayload, setSessionPayload] = useState(null);
  const [boundSession, setBoundSession] = useState(null);
  const [seats, setSeats] = useState(() => createInitialSeats());
  const [nameInput, setNameInput] = useState("");

  const selectedSeat = selectedSeatId ? seats[selectedSeatId] : null;

  const currentTurnName = useMemo(() => {
    if (!currentTurnSeatId) {
      return "—";
    }

    const seat = seats[currentTurnSeatId];
    if (!seat?.occupied) {
      return currentTurnSeatId;
    }

    return `${seat.name || "Occupied"} (${currentTurnSeatId})`;
  }, [currentTurnSeatId, seats]);

  const sendWs = (payload) => {
    const ws = wsRef.current;

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.log("socket not open, cannot send:", payload);
      return;
    }

    ws.send(JSON.stringify(payload));
  };

  const connectSocket = () => {
    const existing = wsRef.current;
    if (
      existing &&
      (existing.readyState === WebSocket.OPEN ||
        existing.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    setSocketStatus("connecting");

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setSocketStatus("open");
      ws.send(JSON.stringify(makeTokenMessage(clientTokenRef.current)));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        setRawLastMessage(msg);

        const snapshot = parseSnapshot(msg);
        if (snapshot) {
          setLatestSnapshot(snapshot);
          return;
        }

        if (msg?.type === "session" || msg?.type === "session_state") {
          setSessionPayload(msg);
          return;
        }

        if (msg?.type === "bound_session") {
          setBoundSession(msg);
          return;
        }

        if (msg?.type === "tavern_state") {
          if (msg.seats) {
            setSeats(msg.seats);
          }

          setCurrentTurnSeatId(msg.currentTurnSeatId ?? null);
        }
      } catch (err) {
        console.log("ws parse error:", err);
      }
    };

    ws.onclose = () => {
      setSocketStatus("closed");
      wsRef.current = null;
    };

    ws.onerror = () => {
      ws.close();
    };
  };

  const disconnectSocket = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    wsRef.current?.close();
    wsRef.current = null;
    setSocketStatus("closed");
  };

  const createNewIdentity = () => {
    const nextToken =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `client_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    localStorage.setItem("drunk_app_client_token", nextToken);
    clientTokenRef.current = nextToken;
    setBoundSession(null);
  };

  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      wsRef.current?.close();
    };
  }, []);

  const handleSeatClick = (seatId) => {
    setSelectedSeatId(seatId);

    if (seats[seatId]?.name) {
      setNameInput(seats[seatId].name);
    }
  };

  const toggleSeatOccupiedLocal = () => {
    if (!selectedSeatId) {
      return;
    }

    setSeats((prev) => {
      const previousSeat = prev[selectedSeatId];
      const nextSeats = { ...prev };

      nextSeats[selectedSeatId] = previousSeat.occupied
        ? {
            ...previousSeat,
            occupied: false,
            name: "",
            readingCount: 0,
            lastBAC: null,
          }
        : {
            ...previousSeat,
            occupied: true,
            name: previousSeat.name || selectedSeatId.toUpperCase(),
            readingCount: 0,
            lastBAC: null,
          };

      return nextSeats;
    });
  };

  const applyNameLocal = () => {
    if (!selectedSeatId) {
      return;
    }

    setSeats((prev) => ({
      ...prev,
      [selectedSeatId]: {
        ...prev[selectedSeatId],
        occupied: true,
        name: nameInput.trim(),
      },
    }));
  };

  const clearReadingLocal = () => {
    if (!selectedSeatId) {
      return;
    }

    setSeats((prev) => ({
      ...prev,
      [selectedSeatId]: {
        ...prev[selectedSeatId],
        readingCount: 0,
        lastBAC: null,
      },
    }));
  };

  const setTurnToSelectedLocal = () => {
    if (!selectedSeatId) {
      return;
    }

    setCurrentTurnSeatId(selectedSeatId);
  };

  const advanceTurnLocal = () => {
    const occupiedSeatIds = seatOrder.filter((seatId) => seats[seatId].occupied);

    if (occupiedSeatIds.length === 0) {
      setCurrentTurnSeatId(null);
      return;
    }

    if (!currentTurnSeatId || !occupiedSeatIds.includes(currentTurnSeatId)) {
      setCurrentTurnSeatId(occupiedSeatIds[0]);
      return;
    }

    const currentIndex = occupiedSeatIds.indexOf(currentTurnSeatId);
    const nextIndex = (currentIndex + 1) % occupiedSeatIds.length;
    setCurrentTurnSeatId(occupiedSeatIds[nextIndex]);
  };

  const simulateSnapshot = ({ state, bac, voltage, ppm }) => {
    const snapshot = {
      state,
      t_us: Date.now() * 1000,
      voltage,
      ppm,
      bac,
    };

    setLatestSnapshot(snapshot);

    if (state === BreathState.Analyzed && currentTurnSeatId) {
      setSeats((prev) => ({
        ...prev,
        [currentTurnSeatId]: {
          ...prev[currentTurnSeatId],
          readingCount: prev[currentTurnSeatId].readingCount + 1,
          lastBAC: bac,
        },
      }));
    }
  };

  return (
    <Flex
      w="100%"
      minH="100vh"
      bg="#2B1D14"
      p={6}
      gap={6}
      direction={{ base: "column", xl: "row" }}
    >
      <Flex flex="1" align="center" justify="center">
        <Box
          position="relative"
          w="min(1100px, 95vw)"
          h="720px"
          borderWidth="2px"
          borderColor="rgba(255,255,255,0.08)"
          borderRadius="xl"
          bg="#3B2416"
          overflow="hidden"
        >
          <Box
            position="absolute"
            left="50%"
            top="50%"
            transform="translate(-50%, -50%)"
            w="340px"
            h="220px"
            borderRadius="full"
            bg="#6E4B2A"
            border="4px solid #2A170E"
            display="flex"
            alignItems="center"
            justifyContent="center"
            boxShadow="0 18px 30px rgba(0,0,0,0.35)"
          >
            <VStack spacing={1}>
              <Text color="#FAF1D9" fontWeight="bold" letterSpacing="wide">
                SESSION TEST
              </Text>
              <Text color="#E9D7B7" fontSize="sm">
                Current Turn: {currentTurnName}
              </Text>
              <Text color="#E9D7B7" fontSize="sm">
                Socket: {socketStatus}
              </Text>
            </VStack>
          </Box>

          <HStack
            position="absolute"
            top="70px"
            left="50%"
            transform="translateX(-50%)"
            spacing={10}
          >
            {seatGroups.top.map((seatId) => (
              <SeatButton
                key={seatId}
                seatId={seatId}
                seat={seats[seatId]}
                isCurrent={seatId === currentTurnSeatId}
                isSelected={seatId === selectedSeatId}
                onClick={handleSeatClick}
              />
            ))}
          </HStack>

          <HStack
            position="absolute"
            bottom="70px"
            left="50%"
            transform="translateX(-50%)"
            spacing={10}
          >
            {seatGroups.bottom.map((seatId) => (
              <SeatButton
                key={seatId}
                seatId={seatId}
                seat={seats[seatId]}
                isCurrent={seatId === currentTurnSeatId}
                isSelected={seatId === selectedSeatId}
                onClick={handleSeatClick}
              />
            ))}
          </HStack>

          <VStack
            position="absolute"
            left="70px"
            top="50%"
            transform="translateY(-50%)"
            spacing={8}
          >
            {seatGroups.left.map((seatId) => (
              <SeatButton
                key={seatId}
                seatId={seatId}
                seat={seats[seatId]}
                isCurrent={seatId === currentTurnSeatId}
                isSelected={seatId === selectedSeatId}
                onClick={handleSeatClick}
              />
            ))}
          </VStack>

          <VStack
            position="absolute"
            right="70px"
            top="50%"
            transform="translateY(-50%)"
            spacing={8}
          >
            {seatGroups.right.map((seatId) => (
              <SeatButton
                key={seatId}
                seatId={seatId}
                seat={seats[seatId]}
                isCurrent={seatId === currentTurnSeatId}
                isSelected={seatId === selectedSeatId}
                onClick={handleSeatClick}
              />
            ))}
          </VStack>
        </Box>
      </Flex>

      <Box
        w={{ base: "100%", xl: "450px" }}
        bg="#3B2416"
        borderWidth="2px"
        borderColor="rgba(255,255,255,0.08)"
        borderRadius="xl"
        p={5}
      >
        <VStack align="stretch" spacing={4}>
          <Text color="#FAF1D9" fontWeight="bold" fontSize="lg">
            Session Test Panel
          </Text>

          <Separator borderColor="rgba(255,255,255,0.12)" />

          <SectionTitle>Connection</SectionTitle>
          <HStack wrap="wrap">
            <Button
              onClick={connectSocket}
              isDisabled={
                socketStatus === "open" || socketStatus === "connecting"
              }
            >
              Connect
            </Button>

            <Button
              onClick={disconnectSocket}
              isDisabled={socketStatus !== "open"}
            >
              Disconnect
            </Button>

            <Button
              onClick={createNewIdentity}
              isDisabled={
                socketStatus === "open" || socketStatus === "connecting"
              }
            >
              New Identity
            </Button>
          </HStack>

          <Separator borderColor="rgba(255,255,255,0.12)" />

          <DebugRow label="Socket" value={socketStatus} />
          <DebugRow label="Client Token" value={clientTokenRef.current ?? "—"} />
          <DebugRow label="Bound Client ID" value={boundSession?.clientId ?? "—"} />
          <DebugRow label="Bound Seat ID" value={boundSession?.seatId ?? "—"} />
          <DebugRow label="Bound Name" value={boundSession?.playerName ?? "—"} />
          <DebugRow label="Selected Seat" value={selectedSeatId ?? "—"} />
          <DebugRow label="Current Turn" value={currentTurnSeatId ?? "—"} />
          <DebugRow
            label="Snapshot State"
            value={latestSnapshot ? getBreathStateLabel(latestSnapshot.state) : "—"}
          />

          <Separator borderColor="rgba(255,255,255,0.12)" />

          <SectionTitle>Selected Seat</SectionTitle>
          <Box bg="#2A170E" borderRadius="md" p={3} color="#FAF1D9" fontSize="sm">
            <Text>Occupied: {selectedSeat ? String(selectedSeat.occupied) : "—"}</Text>
            <Text>Name: {selectedSeat?.name || "—"}</Text>
            <Text>Reading Count: {selectedSeat?.readingCount ?? "—"}</Text>
            <Text>Last BAC: {selectedSeat?.lastBAC ?? "—"}</Text>
          </Box>

          <HStack>
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Drinker name"
              bg="#FAF1D9"
              color="#2A170E"
            />
            <Button onClick={applyNameLocal}>Set Name</Button>
          </HStack>

          <HStack wrap="wrap">
            <Button onClick={toggleSeatOccupiedLocal}>Toggle Occupied</Button>
            <Button onClick={setTurnToSelectedLocal}>Set Turn</Button>
            <Button onClick={advanceTurnLocal}>Advance Turn</Button>
            <Button onClick={clearReadingLocal}>Clear Reading</Button>
          </HStack>

          <Separator borderColor="rgba(255,255,255,0.12)" />

          <SectionTitle>WebSocket Commands</SectionTitle>
          <HStack wrap="wrap">
            <Button
              onClick={() =>
                sendWs(
                  makeClaimSeatMessage(
                    selectedSeatId,
                    nameInput.trim() || "Test Drinker"
                  )
                )
              }
              isDisabled={!selectedSeatId || socketStatus !== "open"}
            >
              WS Claim Seat
            </Button>

            <Button
              onClick={() => sendWs(makeLeaveSeatMessage())}
              isDisabled={socketStatus !== "open"}
            >
              WS Leave Seat
            </Button>

            <Button
              onClick={() => sendWs(makeRenameSelfMessage(nameInput.trim()))}
              isDisabled={!nameInput.trim() || socketStatus !== "open"}
            >
              WS Rename Self
            </Button>

            <Button
              onClick={() => sendWs(makeAdvanceTurnMessage())}
              isDisabled={socketStatus !== "open"}
            >
              WS Advance/Skip
            </Button>
          </HStack>

          <Separator borderColor="rgba(255,255,255,0.12)" />

          <SectionTitle>Local Reading Simulation</SectionTitle>
          <HStack wrap="wrap">
            <Button
              onClick={() =>
                simulateSnapshot({
                  state: BreathState.Warmup,
                  bac: 0,
                  voltage: 1.12,
                  ppm: 0,
                })
              }
            >
              Warmup
            </Button>

            <Button
              onClick={() =>
                simulateSnapshot({
                  state: BreathState.Ready,
                  bac: 0,
                  voltage: 1.18,
                  ppm: 0,
                })
              }
            >
              Ready
            </Button>

            <Button
              onClick={() =>
                simulateSnapshot({
                  state: BreathState.Processing,
                  bac: 0.041,
                  voltage: 1.35,
                  ppm: 22.4,
                })
              }
            >
              Processing
            </Button>

            <Button
              onClick={() =>
                simulateSnapshot({
                  state: BreathState.Cooldown,
                  bac: 0,
                  voltage: 1.08,
                  ppm: 0,
                })
              }
            >
              Cooldown
            </Button>
          </HStack>

          <HStack wrap="wrap">
            <Button
              onClick={() =>
                simulateSnapshot({
                  state: BreathState.Analyzed,
                  bac: 0.01,
                  voltage: 1.42,
                  ppm: 9.2,
                })
              }
            >
              Analyze 0.01
            </Button>

            <Button
              onClick={() =>
                simulateSnapshot({
                  state: BreathState.Analyzed,
                  bac: 0.03,
                  voltage: 1.44,
                  ppm: 18.2,
                })
              }
            >
              Analyze 0.03
            </Button>

            <Button
              onClick={() =>
                simulateSnapshot({
                  state: BreathState.Analyzed,
                  bac: 0.06,
                  voltage: 1.47,
                  ppm: 28.1,
                })
              }
            >
              Analyze 0.06
            </Button>

            <Button
              onClick={() =>
                simulateSnapshot({
                  state: BreathState.Analyzed,
                  bac: 0.1,
                  voltage: 1.5,
                  ppm: 35.7,
                })
              }
            >
              Analyze 0.10
            </Button>
          </HStack>

          <Separator borderColor="rgba(255,255,255,0.12)" />

          <SectionTitle>Latest Device Snapshot</SectionTitle>
          <Box
            bg="#2A170E"
            borderRadius="md"
            p={3}
            color="#FAF1D9"
            fontSize="sm"
            fontFamily="mono"
            whiteSpace="pre-wrap"
          >
            {latestSnapshot ? JSON.stringify(latestSnapshot, null, 2) : "—"}
          </Box>

          <SectionTitle>Last WS Message</SectionTitle>
          <Box
            bg="#2A170E"
            borderRadius="md"
            p={3}
            color="#FAF1D9"
            fontSize="sm"
            fontFamily="mono"
            whiteSpace="pre-wrap"
            maxH="180px"
            overflowY="auto"
          >
            {rawLastMessage ? JSON.stringify(rawLastMessage, null, 2) : "—"}
          </Box>

          <SectionTitle>Session Payload</SectionTitle>
          <Box
            bg="#2A170E"
            borderRadius="md"
            p={3}
            color="#FAF1D9"
            fontSize="sm"
            fontFamily="mono"
            whiteSpace="pre-wrap"
            maxH="180px"
            overflowY="auto"
          >
            {sessionPayload ? JSON.stringify(sessionPayload, null, 2) : "—"}
          </Box>

          <SectionTitle>Bound Session</SectionTitle>
          <Box
            bg="#2A170E"
            borderRadius="md"
            p={3}
            color="#FAF1D9"
            fontSize="sm"
            fontFamily="mono"
            whiteSpace="pre-wrap"
            maxH="180px"
            overflowY="auto"
          >
            {boundSession ? JSON.stringify(boundSession, null, 2) : "—"}
          </Box>
        </VStack>
      </Box>
    </Flex>
  );
}