import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Spinner, HStack, Text } from "@chakra-ui/react";

import MainContainer from "../components/MainContainer.jsx";
import HeaderPlaceholder from "../components/HeaderPlaceholder.jsx";
import TavernEnterance from "../../../assets/textures/TavernEnterance.png";

import {
  INACTIVE_STABLE_MS,
  SESSION_SPINNER_MS,
  tavernColors,
} from "../constants/tavernConstants.js";
import { makeSessionMessage } from "../protocol/commands.js";
import { useSessionStatusSocket } from "../hooks/useSessionStatusSocket.js";

function StartScreenShell({ children }) {
  return (
    <MainContainer header={<HeaderPlaceholder />}>
      <Box
        minH="70vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        position="relative"
        overflow="hidden"
        bgImage={`url(${TavernEnterance})`}
        bgRepeat="no-repeat"
        bgSize="cover"
        bgPosition="center"
      >
        <Box position="absolute" inset={0} bg="rgba(20, 10, 5, 0.45)" />
        <Box position="relative" zIndex={1}>
          {children}
        </Box>
      </Box>
    </MainContainer>
  );
}

export default function StartDrinking() {
  const navigate = useNavigate();
  const showStartTimerRef = useRef(null);
  const enterTimerRef = useRef(null);

  const { gotSession, sessionActive, sendRaw } = useSessionStatusSocket();

  const [mode, setMode] = useState("checking");

  useEffect(() => {
    if (showStartTimerRef.current) {
      clearTimeout(showStartTimerRef.current);
    }

    if (enterTimerRef.current) {
      clearTimeout(enterTimerRef.current);
    }

    if (!gotSession) {
      setMode("checking");
      return;
    }

    if (sessionActive) {
      setMode("entering");
      enterTimerRef.current = setTimeout(() => {
        navigate("/live", { replace: true });
      }, SESSION_SPINNER_MS);
      return;
    }

    setMode("checking");
    showStartTimerRef.current = setTimeout(() => {
      setMode("start");
    }, INACTIVE_STABLE_MS);

    return () => {
      if (showStartTimerRef.current) {
        clearTimeout(showStartTimerRef.current);
      }

      if (enterTimerRef.current) {
        clearTimeout(enterTimerRef.current);
      }
    };
  }, [gotSession, sessionActive, navigate]);

  const startSession = () => {
    sendRaw(makeSessionMessage(true));
  };

  if (mode === "entering") {
    return (
      <StartScreenShell>
        <HStack
          gap={4}
          px={6}
          py={5}
          borderRadius="xl"
          bg="rgba(42, 23, 14, 0.72)"
          borderWidth="1px"
          borderColor="rgba(255,255,255,0.14)"
          boxShadow="0 18px 30px rgba(0,0,0,0.35)"
        >
          <Spinner color={tavernColors.brass} thickness="4px" size="md" />
          <Text color={tavernColors.panel} fontWeight="semibold" fontSize="lg">
            Entering the tavern…
          </Text>
        </HStack>
      </StartScreenShell>
    );
  }

  if (mode !== "start") {
    return (
      <StartScreenShell>
        <Box
          px={6}
          py={5}
          borderRadius="xl"
          bg="rgba(42, 23, 14, 0.72)"
          borderWidth="1px"
          borderColor="rgba(255,255,255,0.14)"
          boxShadow="0 18px 30px rgba(0,0,0,0.35)"
        >
          <Spinner color={tavernColors.brass} thickness="4px" size="lg" />
        </Box>
      </StartScreenShell>
    );
  }

  return (
    <StartScreenShell>
      <Button
        size="lg"
        onClick={startSession}
        bg={tavernColors.brass}
        color={tavernColors.woodDark}
        borderWidth="1px"
        borderColor="#E7D49A"
        px={8}
        py={6}
        fontSize="lg"
        fontWeight="bold"
        boxShadow="0 12px 24px rgba(0,0,0,0.35)"
        _hover={{ bg: "#D6B04A" }}
        _active={{ bg: "#B38D1F" }}
      >
        Start Drinking
      </Button>
    </StartScreenShell>
  );
}