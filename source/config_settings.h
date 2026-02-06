// constants.h
#pragma once
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <string>

/* Compile time configurables */
namespace DrunkAPI::Config
{
    // Default ADS1115 & Sampler Settings
    inline constexpr std::uint16_t SampleRate_Hz = 128;
    inline constexpr auto SamplePeriod = std::chrono::microseconds(1'000'000 / SampleRate_Hz); // 7812us

    // If you want rounding instead of truncation uncomment this.
    // inline constexpr auto SamplePeriod = std::chrono::microseconds((1'000'000 + SampleRate_Hz/2) / SampleRate_Hz);

    // Default Ring Buffer 
    inline constexpr std::size_t RingSize = 4096; // Note, must be valid power of 2

    // Default Consumer Settings
    inline constexpr std::chrono::milliseconds ConsumerIdleSleep(5);
    inline constexpr std::chrono::milliseconds ConsumerTickSleep(50);
    inline constexpr std::chrono::minutes ConsumerTimeout(1); // 15 min
    inline constexpr std::size_t ConsumerMaxBatch(256); // Default 256

    // Default Welford Analyzer Settings
    inline constexpr std::uint32_t WindowUs = 1'000'000; // 1 Second per Window default
    inline constexpr std::size_t   MinWindowSamples = 80; // 80 per second

    // Statistical Stability Tuneables
    inline constexpr double Max_Sd_Threshold = 0.002; // default 0.003
    inline constexpr double Max_Drift_Rate_Per_Sec = 0.001; // default 0.001
    inline constexpr size_t Max_Consecutive_Windows = 3; // default 3,

    // Circuit Values (Calibration)
    inline constexpr double RLoad = 20'000.0; // RLoad Resistor
    inline constexpr double R1_3_3v = 10'000.0; // Voltage divider Resistor 5v -> 3.3 on ADC pin
    inline constexpr const float Rs_Ro_Ratio_Datasheet = 60.0; // Divider -> Rs/Ro = 60. Found from Y-Intercept of Datasheet.
    inline constexpr const double Ro_Air = 685.124026; // R0 baseline with 18.9L jug approx 1.187594v mean, extracted from testing. 

    // Raw TCP Host Connection Settings
    inline constexpr const std::string HOST_IP = "127.0.0.1"; // W/e your host machine is running
    inline constexpr const int HOST_PORT = 9009;

    // Breath Analyzer Settings
    // -----------------------------
    inline constexpr const uint32_t Min_Blowtime_Seconds = 400'000;
    inline constexpr const uint32_t Max_Blowtime_Seconds = 5'000'000; // Consume up to n(sec) windows of samples. 
    inline constexpr const uint16_t Warmup_Stable_Window_Count = 25; // Scale this by Window time. Eg. if 5 second window 5*(5 default) = 25 
    inline constexpr const uint16_t Cooldown_Stable_Window_Count = 25;

    // Rise/Fall Hyteresis offsets
    inline constexpr const double Rise_Hysteresis = 0.05;
    inline constexpr const double Fall_Hysteresis = 0.02;
    inline constexpr const double Ready_Hysteresis = 0.01;
    inline constexpr const double Baseline_Alpha_Percent = 0.05;
    inline constexpr const double Rise_Noise_Factor = 3.0;
    inline constexpr const double Fall_Noise_Factor = 2.0;
    inline constexpr const double Ready_Noise_Factor = 2.0;
}
// Used for Welford Analysis 
struct Analyzer_Config
{
    // Windowing
    uint32_t window_micro = DrunkAPI::Config::WindowUs;
    size_t min_window_sample_size = DrunkAPI::Config::MinWindowSamples;

    // Stability Thresholds
    double stddev_max = DrunkAPI::Config::Max_Sd_Threshold; // volts (or Rs, or ratio)
    double drift_per_sec_max = DrunkAPI::Config::Max_Drift_Rate_Per_Sec; // unit/sec
    size_t stable_consecutive_windows_req = DrunkAPI::Config::Max_Consecutive_Windows;

    // MQ3 Circuit Defaults
    double RL = DrunkAPI::Config::RLoad;
    double R1_3_3v = DrunkAPI::Config::R1_3_3v;
    float Rs_Ro_Div = DrunkAPI::Config::Rs_Ro_Ratio_Datasheet; // Pulled from y-intercept Air on MQ3 datasheet. Rs/RO = 60
    double Ro_Air = DrunkAPI::Config::Ro_Air;
    
};

// Used for Runtime Alcohol Breath Analysis
struct BreathAnalyzer_Config
{
    uint16_t warmup_stable_windows = DrunkAPI::Config::Warmup_Stable_Window_Count;
    uint16_t cooldown_stable_windows = DrunkAPI::Config::Cooldown_Stable_Window_Count;

    // Blow time ranges.
    uint32_t min_blow_time_us = DrunkAPI::Config::Min_Blowtime_Seconds;
    uint32_t max_blow_time_us = DrunkAPI::Config::Max_Blowtime_Seconds;

    // Hysteresis for falling and rising alcohol detection
    double start_delta_v = DrunkAPI::Config::Rise_Hysteresis; // Offset Start Threshold from a Ready State.
    double end_delta_v = DrunkAPI::Config::Fall_Hysteresis; // Offset for End Threshold to a Cooldown State.

    // EWMA = (1-Alpha) * previous baseline + Alpha*Baseline, used to move smoothly towards a new baseline without snapping towards it.
    double baseline_alpha = DrunkAPI::Config::Baseline_Alpha_Percent; // Move 5 percent towards the new baseline. Tuneable.
    double start_k_sigma = DrunkAPI::Config::Rise_Noise_Factor; // Scale the STD noise to shift the threshold baseline. Thus if noise is high the threshhold adjusts.
    double end_k_sigma = DrunkAPI::Config::Rise_Noise_Factor;  // Scale the STD noise on the fall off.

    // Ready bounce-back
    double ready_delta_v = DrunkAPI::Config::Ready_Hysteresis;
    double ready_k_sigma = DrunkAPI::Config::Ready_Noise_Factor;

    /*Slope Voltage Velocity Gating (Idea not implemented)
    double min_rise_volts_sec = 0.15; 
    uint32_t slope_stable_windows = 2;
    */

};

struct Consumer_Config
{
    std::chrono::milliseconds consumer_idle_sleep {DrunkAPI::Config::ConsumerIdleSleep};
    std::chrono::milliseconds consumer_tick_sleep {DrunkAPI::Config::ConsumerTickSleep};
    std::chrono::minutes Timeout {DrunkAPI::Config::ConsumerTimeout};
    std::size_t max_batch = DrunkAPI::Config::ConsumerMaxBatch;
};

struct TCP_config
{
    std::string HOST_IP = DrunkAPI::Config::HOST_IP;
    uint16_t HOST_PORT = DrunkAPI::Config::HOST_PORT;
};