#pragma once
#include <cstdint>
#include <cstddef>
#include <cmath>
#include <limits>
#include <sys/types.h>
#include "config_settings.h"
#include "process_runner.h"
#include "sampler.h"

// -----------------------------------------------------------------------------
// MQ-3 Calibration Notes
// -----------------------------------------------------------------------------
//
// Voltage Divider (protection):
//   R1 = 10kΩ (top), RL = 20kΩ (bottom)
//
//   VAdc = Vout * (RL / (R1 + RL)) = Vout * 2/3
//   Vout = VAdc * 1.5
//
// MQ-3 Resistance:
//   Rs = RL * (Vcc / Vout - 1)
//   ratio = Rs / Ro
//
// Ro determination:
//   Option 1: Clean air baseline
//       Ro = Rs_clean_air / 60  (per datasheet typical)
//
//   Option 2: Known ethanol concentration in sealed volume
//       m_eth = target_mg_per_L * volume_L
//
// Log-Log Regression:
//   ratio = a * concentration^b
//   concentration  = (ratio / a)^(1/b)
//
// See calibration spreadsheet for a worked example.
// -----------------------------------------------------------------------------

// Analyzer uses the Welford Algorithm to find a stable measurement when sampling for RS. This uses a mean sliding window that provides saving from memory allocations when analyzing live stream data.
namespace DrunkAPI 
{
    // Defined these so we dont have implicit converstions in function parameters
    struct Microseconds { std::uint64_t count; explicit constexpr Microseconds(std::uint64_t count_) : count(count_) {} };
    struct SampleValue  { double val; explicit constexpr SampleValue(double value) : val(value) {} };

    // Welford Stats Helper
    struct WelfordStats 
    {
        std::size_t num_samples = 0;
        double mean = 0.0;
        double m2   = 0.0; // sum of squares of diffs from mean

        void reset() { num_samples = 0; mean = 0.0; m2 = 0.0; }

        void push(double value) 
        {
            ++num_samples;
            const double delta  = value - mean;
            mean += delta / (double)num_samples;
            const double delta2 = value - mean;
            m2 += delta * delta2;
        }

        double variance_sample() const {
            return (num_samples > 1) ? (m2 / (double)(num_samples- 1)) : 0.0;
        }

        double stddev_sample() const {
            return std::sqrt(variance_sample());
        }
    };

    struct WindowResult 
    {
        bool stable = false;

        // stats of current window
        double mean = 0.0;
        double stddev = 0.0;

        // drift stats
        double mean_prev = 0.0;
        double drift_per_sec = 0.0;

        std::uint64_t window_start_us = 0;
        std::uint64_t window_end_us   = 0;
    };

    class WelfordAnalyzer final
    {
        public:
            explicit WelfordAnalyzer(Analyzer_Config n_cfg = {}) : cfg(n_cfg) {}

            WelfordAnalyzer(const WelfordAnalyzer&) = delete;
            WelfordAnalyzer& operator=(const WelfordAnalyzer&) = delete;

            
            StepResult<WindowResult> AnalyzeBatch(const Sample* Samples, size_t n, double(*get_value)(const Sample&)); // I use a function pointer here because I'd like to pass a lambda function to extract out voltage from a sample.
            StepResult<WindowResult> AnalyzeSample(Microseconds t_micro, SampleValue sample);
            StepResult<WindowResult> FinalizeWindow();

            void reset();

            Analyzer_Config Get_AnalyzerConfg() const {return cfg;};

        private:
            Analyzer_Config cfg;
            WelfordStats WfS; 
            
            size_t stable_window_count = 0;
            uint64_t window_start_micro_sec = 0;
            uint64_t window_end_micro_sec = 0;

            double prev_window_mean = std::numeric_limits<double>::quiet_NaN();
    };

    //enum class BreathAnalyzerState : uint8_t {Warmup, Ready, Processing, Cooldown, Analyzed};
    enum class BreathAnalyzerState : uint8_t {None, Warmup, Ready, Processing, Cooldown, Analyzed};
    // Finalized Breath Events.
    struct BreathEvent
    {
        uint64_t start_us = 0;
        uint64_t end_us = 0;
        double peak_voltage = 0.0;
        BreathAnalyzerState State = BreathAnalyzerState::Warmup;
    };

    // Current Breath Snapshot
    struct BreathResult
    {
        // Live baselines
        double baseline_mean = 0.0; // This is the floor range found during Welford Analysis, Ie we have a moving floor baseline depending on consecutive windows.
        double baseline_std = 0.0; // This is the baseline standard deviation to track noise threshold of our baseline voltage.

        // Peak voltage.
        double peak_volts = 0.0;

        WindowResult last_window{};
    };

    class BreathAnalyzer final
    {
        public:
            explicit BreathAnalyzer(BreathAnalyzer_Config b_cfg = {}) : bcfg(b_cfg) {}
            
            // Consumes Finalized Welford Windows.
            bool AnalyzeBreath(const WindowResult& breathwindow, BreathResult& breathresult, BreathEvent& out_event);

            void reset(BreathResult& breathresult)
            {
                cur_peak_voltage = 0.0;
                breathresult.peak_volts = 0.0;
                breath_start_us = 0;
                baseline_stable_count = 0;
            }

        private:

            BreathAnalyzer_Config bcfg;
            BreathAnalyzerState breath_state = BreathAnalyzerState::Warmup;
            uint32_t baseline_stable_count = 0;
            uint32_t cooldown_stable_count = 0;
            uint64_t breath_start_us = 0;
            uint64_t cooldown_start_us = 0;
            uint64_t analyzed_end_us = 0;

            double cur_peak_voltage = 0.0;

            bool bWarmedup = false;
            bool bFoundbaseline = false;
            bool bFreezebaseline = false;

            // State Helpers
            bool Warmup();
            void UpdateBaseline(const WindowResult& breathwindow, BreathResult& breathresult);
            bool Ready(const WindowResult& breathwindow, BreathResult& breathresult, double start_threshold);
            bool Processing(const WindowResult& breathwindow, BreathResult& breathresult, double end_threshold, BreathEvent& out_event);
            bool Cooldown(const WindowResult& breathwindow, BreathResult& breathresult, double ready_threshold);
    };


}
 
