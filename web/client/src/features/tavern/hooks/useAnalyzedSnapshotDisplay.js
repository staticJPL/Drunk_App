import { useEffect, useRef, useState } from "react";
import { ANALYZED_HOLD_MS } from "../constants/tavernConstants.js";
import { BreathState } from "../protocol/breathSnapshot.js";

export function useAnalyzedSnapshotDisplay(latestSnap) {
  const [displaySnap, setDisplaySnap] = useState(null);
  const holdTimerRef = useRef(null);
  const lastSnapRef = useRef(null);

  useEffect(() => {
    lastSnapRef.current = latestSnap;

    if (!latestSnap) {
      return;
    }

    if (latestSnap.state === BreathState.Analyzed) {
      setDisplaySnap(latestSnap);

      if (!holdTimerRef.current) {
        holdTimerRef.current = setTimeout(() => {
          holdTimerRef.current = null;
          setDisplaySnap(lastSnapRef.current);
        }, ANALYZED_HOLD_MS);
      }

      return;
    }

    if (!holdTimerRef.current) {
      setDisplaySnap(latestSnap);
    }
  }, [latestSnap]);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    };
  }, []);

  return displaySnap;
}