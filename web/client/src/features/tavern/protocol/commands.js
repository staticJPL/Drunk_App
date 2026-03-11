export function makeSessionMessage(active) {
  return {
    type: "session",
    active,
  };
}

export function makeTokenMessage(clientToken) {
  return {
    type: "token",
    clientToken,
  };
}

export function makeClaimSeatMessage(seatId, name) {
  return {
    type: "claim_seat",
    seatId,
    name,
  };
}

export function makeLeaveSeatMessage() {
  return {
    type: "leave_seat",
  };
}

export function makeRenameSelfMessage(name) {
  return {
    type: "rename_self",
    name,
  };
}

export function makeAdvanceTurnMessage() {
  return {
    type: "advance_turn",
  };
}

export function makeAdminRemoveSeatMessage(seatId) {
  return {
    type: "admin_remove_seat",
    seatId,
  };
}

export function makeAdminSimulateSnapshotMessage({ state, voltage, ppm, bac }) {
  return {
    type: "simulate_snapshot",
    state,
    t_us: Date.now() * 1000,
    voltage,
    ppm,
    bac,
  };
}

export function makeAdminEndSessionMessage() {
  return {
    type: "admin_end_session",
  };
}