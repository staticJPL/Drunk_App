"use strict";

const { BreathAnalyzerState } = require("./constants");

function isObject(value) {
  return value !== null && typeof value === "object";
}

function isBreathAnalyzerState(value) {
  return Object.values(BreathAnalyzerState).includes(value);
}

function isValidIdentity(obj) {
  return (
    isObject(obj) &&
    obj.type === "device" &&
    typeof obj.clientId === "number"
  );
}

function isValidTokenMsg(obj) {
  return (
    isObject(obj) &&
    obj.type === "token" &&
    typeof obj.clientToken === "string" &&
    obj.clientToken.length > 0
  );
}

function isValidSessionMsg(obj) {
  return (
    isObject(obj) &&
    obj.type === "session" &&
    typeof obj.active === "boolean"
  );
}

function isValidSnapshot(obj) {
  return (
    isObject(obj) &&
    isBreathAnalyzerState(obj.state) &&
    typeof obj.t_us === "number" &&
    typeof obj.voltage === "number" &&
    typeof obj.ppm === "number" &&
    typeof obj.bac === "number"
  );
}

function isValidClaimSeatMsg(obj) {
  return (
    isObject(obj) &&
    obj.type === "claim_seat" &&
    typeof obj.seatId === "string" &&
    typeof obj.name === "string"
  );
}

function isValidLeaveSeatMsg(obj) {
  return isObject(obj) && obj.type === "leave_seat";
}

function isValidRenameSelfMsg(obj) {
  return (
    isObject(obj) &&
    obj.type === "rename_self" &&
    typeof obj.name === "string"
  );
}

function isValidAdvanceTurnMsg(obj) {
  return isObject(obj) && obj.type === "advance_turn";
}

function isValidAdminRemoveSeatMsg(obj) {
  return (
    isObject(obj) &&
    obj.type === "admin_remove_seat" &&
    typeof obj.seatId === "string"
  );
}

function isValidSimulateSnapshotMsg(obj) {
  return (
    isObject(obj) &&
    obj.type === "simulate_snapshot" &&
    isBreathAnalyzerState(obj.state) &&
    typeof obj.t_us === "number" &&
    typeof obj.voltage === "number" &&
    typeof obj.ppm === "number" &&
    typeof obj.bac === "number"
  );
}

function isValidAdminEndSessionMsg(obj) {
  return isObject(obj) && obj.type === "admin_end_session";
}

module.exports = {
  isValidIdentity,
  isValidTokenMsg,
  isValidSessionMsg,
  isValidSnapshot,
  isValidClaimSeatMsg,
  isValidLeaveSeatMsg,
  isValidRenameSelfMsg,
  isValidAdvanceTurnMsg,
  isValidAdminRemoveSeatMsg,
  isValidSimulateSnapshotMsg,
  isValidAdminEndSessionMsg,
};