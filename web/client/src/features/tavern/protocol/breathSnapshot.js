const BreathState = Object.freeze({
  Idle: 0,
  Warmup: 1,
  Ready: 2,
  Processing: 3,
  Cooldown: 4,
  Analyzed: 5,
});

const validBreathStates = new Set(Object.values(BreathState));

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function toFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function parseSnapshot(message) {
  if (!message || typeof message !== "object") {
    return null;
  }

  const state = toFiniteNumber(message.state);
  const tUsRaw = toFiniteNumber(message.t_us);
  const voltage = toFiniteNumber(message.voltage);
  const ppm = toFiniteNumber(message.ppm);
  const bac = toFiniteNumber(message.bac);

  if (state === null || !validBreathStates.has(state)) {
    return null;
  }

  if (tUsRaw === null || tUsRaw < 0) {
    return null;
  }

  if (
    !isFiniteNumber(voltage) ||
    !isFiniteNumber(ppm) ||
    !isFiniteNumber(bac)
  ) {
    return null;
  }

  return {
    state,
    t_us: Math.floor(tUsRaw),
    voltage,
    ppm,
    bac,
  };
}

export function getBreathStateLabel(stateValue) {
  switch (Number(stateValue)) {
    case BreathState.Idle:
      return "Idle";
    case BreathState.Warmup:
      return "Warming up";
    case BreathState.Ready:
      return "Ready";
    case BreathState.Processing:
      return "Processing";
    case BreathState.Cooldown:
      return "Cooling down";
    case BreathState.Analyzed:
      return "Analyzed";
    default:
      return "—";
  }
}

export { BreathState };