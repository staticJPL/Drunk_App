export const WS_URL = "ws://192.168.0.64:8787";

export const ANALYZED_HOLD_MS = 5000;
export const SESSION_SPINNER_MS = 2000;
export const INACTIVE_STABLE_MS = 600;

export const seatOrder = [
  "top_1",
  "top_2",
  "right_1",
  "right_2",
  "right_3",
  "right_4",
  "bottom_1",
  "bottom_2",
  "left_4",
  "left_3",
  "left_2",
  "left_1",
];

export function createInitialSeats() {
  return Object.fromEntries(
    seatOrder.map((seatId) => [
      seatId,
      {
        seatId,
        occupied: false,
        ownerClientId: null,
        clientToken: null,
        name: "",
        connected: false,
        readingCount: 0,
        lastBAC: null,
        lastPPM: null,
        lastVoltage: null,
        lastReadingAtUs: null,
      },
    ])
  );
}

export const tavernColors = {
  bg: "#F3E5C6",
  panel: "#FAF1D9",
  wood: "#3B2416",
  woodDark: "#2A170E",
  brass: "#C9A227",
  ink: "#2A1B12",
};