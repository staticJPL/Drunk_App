import { useState } from "react";

import MainContainer from "../components/MainContainer.jsx";
import HeaderToolbar from "../components/HeaderToolbar.jsx";
import TavernTable from "../components/TavernTable.jsx";
import { SceneStage } from "../components/SceneStage.jsx";
import LiveSeatDialog from "../components/LiveSeatDialog.jsx";
import {
  TavernSceneTopProps,
  TavernSceneLeftProps,
  TavernSceneRightProps,
  TavernSceneBottomProps,
  tavernDecorAssets,
} from "../components/TavernSceneDecor.jsx";

import { useLiveTavernSocket } from "../hooks/useLiveTavernSocket.js";
import { useAnalyzedSnapshotDisplay } from "../hooks/useAnalyzedSnapshotDisplay.js";

import {
  makeAdvanceTurnMessage,
  makeClaimSeatMessage,
  makeLeaveSeatMessage,
  makeRenameSelfMessage,
} from "../protocol/commands.js";

export default function LiveDrinking() {
  const {
    checkedSession,
    currentTurnSeatId,
    latestSnap,
    mySeatId,
    tavernSeats,
    drinkers,
    sendWs,
  } = useLiveTavernSocket();

  const displaySnap = useAnalyzedSnapshotDisplay(latestSnap);

  const [seatDialogOpen, setSeatDialogOpen] = useState(false);
  const [seatDialogMode, setSeatDialogMode] = useState("claim");
  const [seatDialogSeatId, setSeatDialogSeatId] = useState(null);
  const [seatNameInput, setSeatNameInput] = useState("");

  const uiSnap = displaySnap ?? latestSnap;

  const closeSeatDialog = () => {
    setSeatDialogOpen(false);
    setSeatDialogSeatId(null);
    setSeatNameInput("");
  };

  const handleSeatClick = (seatId) => {
    const seat = tavernSeats[seatId];
    if (!seat) {
      return;
    }

    setSeatDialogSeatId(seatId);

    if (!seat.occupied) {
      setSeatDialogMode("claim");
      setSeatNameInput("");
      setSeatDialogOpen(true);
      return;
    }

    if (mySeatId === seatId) {
      setSeatDialogMode("manage");
      setSeatNameInput(seat.name || "");
      setSeatDialogOpen(true);
      return;
    }

    console.log("seat occupied by another player");
  };

  const handleClaimSeat = () => {
    if (!seatDialogSeatId) {
      return;
    }

    const trimmedName = seatNameInput.trim();
    if (!trimmedName) {
      return;
    }

    sendWs(makeClaimSeatMessage(seatDialogSeatId, trimmedName));
    closeSeatDialog();
  };

  const handleRenameSeat = () => {
    const trimmedName = seatNameInput.trim();
    if (!trimmedName) {
      return;
    }

    sendWs(makeRenameSelfMessage(trimmedName));
    closeSeatDialog();
  };

  const handleLeaveSeat = () => {
    sendWs(makeLeaveSeatMessage());
    closeSeatDialog();
  };

  const handleAdvanceTurn = () => {
    sendWs(makeAdvanceTurnMessage());
  };

  if (!checkedSession) {
    return null;
  }

  return (
    <MainContainer header={<HeaderToolbar snapshot={uiSnap} />}>
      <SceneStage
        floorUrl={tavernDecorAssets.stonefloorTexture}
        topH={{ base: "200px", md: "300px", xl: "360px" }}
        bottomH={{ base: "90px", md: "120px" }}
        sideW={{ base: "0px", md: "180px", lg: "240px" }}
        gap={0}
        topProps={<TavernSceneTopProps />}
        leftProps={<TavernSceneLeftProps />}
        rightProps={<TavernSceneRightProps />}
        bottomProps={<TavernSceneBottomProps />}
      >
        <TavernTable
          drinkers={drinkers}
          currentTurnSeatId={currentTurnSeatId}
          mySeatId={mySeatId}
          onSeatClick={handleSeatClick}
          tableMaxW="clamp(180px, calc(min(92vw, 1400px) * 0.26), 420px)"
          chairSize="clamp(44px, calc(min(92vw, 1400px) * 0.085), 120px)"
          tableUrl={tavernDecorAssets.rusticTableTexture}
          bearRugUrl={tavernDecorAssets.bearRug}
          spilledBeerUrl={tavernDecorAssets.spilledBeer}
          chairUrl={tavernDecorAssets.chair}
          showEmptyChairs
        />
      </SceneStage>

      <LiveSeatDialog
        open={seatDialogOpen}
        mode={seatDialogMode}
        seatId={seatDialogSeatId}
        nameInput={seatNameInput}
        onNameInputChange={setSeatNameInput}
        onOpenChange={setSeatDialogOpen}
        onClaim={handleClaimSeat}
        onRename={handleRenameSeat}
        onLeave={handleLeaveSeat}
        onCancel={closeSeatDialog}
      />
    </MainContainer>
  );
}