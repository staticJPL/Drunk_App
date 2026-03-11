import { HStack, Box } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { BreathState } from "../../features/tavern/protocol/breathSnapshot.js";

const indicatorColors = ["#28adfa", "#28fa47", "#fff157", "#f5a43b", "#fa2f2f"];
const PUMP_STOMACH_BAC = 0.45;
const NO_IMPAIRMENT_BAC = 0.02;
const SLIGHTLY_TIPSY_BAC = 0.05;
const DRUNK_BAC = 0.08;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function analyzedMaskFromBAC(bac) {
  const normalizedBac = clamp(Number(bac) || 0, 0, PUMP_STOMACH_BAC);

  if (normalizedBac < NO_IMPAIRMENT_BAC) {
    return new Set([1]);
  }

  if (normalizedBac < SLIGHTLY_TIPSY_BAC) {
    return new Set([1, 2]);
  }

  if (normalizedBac < DRUNK_BAC) {
    return new Set([1, 2, 3]);
  }

  return new Set([1, 2, 3, 4]);
}

export function IndicatorRow({
  breathState = BreathState.Idle,
  bac = 0,
  count = 5,
  size = "14px",
  offColor = "transparent",
  ringColor = "#2A170E",
  blinkMs = 450,
  ...props
}) {
  const [blinkOn, setBlinkOn] = useState(true);

  const blinkBlueOnly =
    breathState === BreathState.Warmup ||
    breathState === BreathState.Cooldown;

  const solidBlueOnly = breathState === BreathState.Ready;
  const blinkAll = breathState === BreathState.Processing;
  const analyzed = breathState === BreathState.Analyzed;

  useEffect(() => {
    if (blinkBlueOnly || blinkAll) {
      setBlinkOn(true);
      const intervalId = setInterval(() => {
        setBlinkOn((value) => !value);
      }, blinkMs);

      return () => clearInterval(intervalId);
    }

    setBlinkOn(true);
  }, [blinkBlueOnly, blinkAll, blinkMs]);

  const analyzedSet = analyzed ? analyzedMaskFromBAC(bac) : null;

  return (
    <HStack gap={2} align="center" {...props}>
      {Array.from({ length: count }).map((_, index) => {
        const color =
          indicatorColors[index] ??
          indicatorColors[indicatorColors.length - 1];

        let isOn = false;

        if (blinkAll) {
          isOn = blinkOn;
        } else if (blinkBlueOnly) {
          isOn = index === 0 && blinkOn;
        } else if (solidBlueOnly) {
          isOn = index === 0;
        } else if (analyzed) {
          isOn = analyzedSet?.has(index) ?? false;
        }

        return (
          <Box
            key={index}
            w={size}
            h={size}
            borderRadius="full"
            bg={isOn ? color : offColor}
            borderWidth="2px"
            borderColor={ringColor}
            opacity={isOn ? 1 : 0.35}
            transition="background-color 160ms ease, opacity 160ms ease"
          />
        );
      })}
    </HStack>
  );
}