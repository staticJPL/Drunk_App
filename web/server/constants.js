"use strict";

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;

const BreathAnalyzerState = Object.freeze({
  Idle: 0,
  Warmup: 1,
  Ready: 2,
  Processing: 3,
  Cooldown: 4,
  Analyzed: 5,
});

const seatOrder = Object.freeze([
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
]);

module.exports = {
  PORT,
  BreathAnalyzerState,
  seatOrder,
};