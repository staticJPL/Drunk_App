#include "analyzer.h"
#include "sampler.h"
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <cstdlib>
#include <fmt/core.h>
#include <sys/types.h>

namespace DrunkAPI
{
    constexpr float us_to_sec = 1'000'000.0;

    void WelfordAnalyzer::reset()
    {
        WfS.reset();
        prev_window_mean = std::numeric_limits<double>::quiet_NaN();
        stable_window_count = 0;
        window_start_micro_sec = 0;
        window_end_micro_sec = 0;
    }

    StepResult<WindowResult> WelfordAnalyzer::AnalyzeBatch(const Sample* Samples, size_t n, double(*get_value)(const Sample&))
    {
        StepResult<WindowResult> last_finalized{};

        for (size_t i = 0; i < n; ++i)
        {
            Microseconds sampletime{Samples[i].t_us};
            SampleValue samplevalue{get_value(Samples[i])};

            auto step = AnalyzeSample(sampletime, samplevalue);

            if (step.result.window_end_us == 0){continue;} // no finalized window this sample

            last_finalized = step;

            if (step.result.stable){return step;}
            
        }

        return last_finalized; // may have end_us=0 if no windows finalized
    }

    // Consume Samples in a monotonic time order. We can feed w.e (volts,raw etc..)
    // Returns a Stable value so we can compute RS.
    // When a window size is finished, set stable to false and window_end_micro = 0
    StepResult<WindowResult> WelfordAnalyzer::AnalyzeSample(Microseconds t_micro, SampleValue sample)
    {
        if(window_start_micro_sec == 0){
            // fresh window
            window_start_micro_sec = t_micro.count;
        }

        StepResult<WindowResult> out{};

        // If we have exceeded the window period then finalize.
        while (t_micro.count - window_start_micro_sec >= cfg.window_micro) 
        {
            // Finalize
            out = FinalizeWindow();
            window_start_micro_sec += cfg.window_micro; // Increment TimeStep
            WfS.reset();
        }

        // Add Sample to the window.
        WfS.push(sample.val);

        // move end time
        window_end_micro_sec = t_micro.count;

        return out;

    }

    StepResult<WindowResult> WelfordAnalyzer::FinalizeWindow()
    {
        StepResult<WindowResult> window{};

        window.result.window_start_us = window_start_micro_sec;
        window.result.window_end_us = window_start_micro_sec + cfg.window_micro;

        size_t num_samples = WfS.num_samples;

        if (num_samples < cfg.min_window_sample_size) 
        {
            // There is Not enough data so don’t evaluate for stability
            stable_window_count = 0;
            window.result.stable = false;
            window.result.mean = WfS.mean;
            window.result.stddev = WfS.stddev_sample();
            window.result.mean_prev = prev_window_mean;
            window.result.drift_per_sec = 0.0;
            return window;
        }

        const double mean = WfS.mean;
        const double standard_deviation = WfS.stddev_sample(); 
        double drift_per_sec = 0.0F;

        if(std::isfinite(prev_window_mean))
        {
            const double dt_second = (double)cfg.window_micro / us_to_sec;
            drift_per_sec = std::abs(mean - prev_window_mean) / dt_second;
        }

        const bool bWindowStable = (static_cast<int>(standard_deviation <= cfg.stddev_max) & static_cast<int>(!std::isfinite(prev_window_mean) || drift_per_sec <= cfg.drift_per_sec_max)) != 0;

        if(bWindowStable)
        {
            ++stable_window_count;
        }
        else 
        {
            // Reset
            stable_window_count = 0;
        }

        window.result.mean = mean;
        window.result.stddev = standard_deviation;
        window.result.mean_prev = prev_window_mean;
        window.result.drift_per_sec = drift_per_sec;
        window.result.stable = (stable_window_count >= cfg.stable_consecutive_windows_req);
        
        // could expose a finalize window call back
        fmt::print("DBG window [{}..{}] mean={:.6f} prev={:.6f} dt_s={:.3f} drift={:.6f}\n",
        window.result.window_start_us,
        window.result.window_end_us,
        mean,
        (std::isfinite(prev_window_mean) ? prev_window_mean : -1.0),
        (double)cfg.window_micro / us_to_sec,
        drift_per_sec);

        prev_window_mean = mean;

        return window;

    }

    bool BreathAnalyzer::AnalyzeBreath(const WindowResult& breathwindow,BreathResult& breathresult, BreathEvent& out_event)
    {
        out_event = {};
        breathresult.last_window = breathwindow;

        if (breathwindow.window_end_us == 0){return false;}

        if (!bWarmedup)
        {
            bFreezebaseline = false;
            UpdateBaseline(breathwindow,breathresult);
            return Warmup();
        }

        // Breath Analyzer Detection Thresholds 
        const double start_threshold = breathresult.baseline_mean + bcfg.start_delta_v + (bcfg.start_k_sigma * breathresult.baseline_std);
        const double end_threshold = breathresult.baseline_mean + bcfg.end_delta_v + (bcfg.end_k_sigma * breathresult.baseline_std);
        const double ready_threshold = breathresult.baseline_mean + bcfg.ready_delta_v + (bcfg.ready_k_sigma * breathresult.baseline_std);

        switch (breath_state) 
        {
            case BreathAnalyzerState::Ready:
                bFreezebaseline = false;
                UpdateBaseline(breathwindow,breathresult);
                out_event.State = BreathAnalyzerState::Ready;
                return Ready(breathwindow,breathresult, start_threshold);

            case BreathAnalyzerState::Processing:
                bFreezebaseline = true;
                out_event.State = BreathAnalyzerState::Processing;
                return Processing(breathwindow, breathresult, end_threshold,out_event);
            
            case DrunkAPI::BreathAnalyzerState::Analyzed:
                out_event.State = BreathAnalyzerState::Analyzed;
                out_event.peak_voltage = breathresult.peak_volts; // Set peak voltaga found
                breath_state = BreathAnalyzerState::Cooldown;
                cooldown_stable_count = 0;
                return false;

            case BreathAnalyzerState::Cooldown:
                bFreezebaseline = false;
                UpdateBaseline(breathwindow, breathresult);
                out_event.State = BreathAnalyzerState::Cooldown;
                return Cooldown(breathwindow, breathresult, ready_threshold);
            
            case BreathAnalyzerState::Warmup:
                default:
                out_event.State = BreathAnalyzerState::Cooldown;
                return false;
        }
    }

    void BreathAnalyzer::UpdateBaseline(const WindowResult& breathwindow, BreathResult& breathresult)
    {
        if (bFreezebaseline){return;}
        if (!breathwindow.stable){return;}

        const double alpha = bcfg.baseline_alpha;

        if (!bFoundbaseline)
        {
            breathresult.baseline_mean = breathwindow.mean;
            breathresult.baseline_std  = breathwindow.stddev;
            bFoundbaseline = true;

            // Count the first stable window immediately
            baseline_stable_count = 1;
        }

            breathresult.baseline_mean = ((1.0 - alpha) * breathresult.baseline_mean) + (alpha * breathwindow.mean);
            breathresult.baseline_std  = ((1.0 - alpha) * breathresult.baseline_std)  + (alpha * breathwindow.stddev);
        
        if (!bWarmedup){baseline_stable_count++;}
    }

    bool BreathAnalyzer::Warmup()
    {
        if (bFoundbaseline && baseline_stable_count >= bcfg.warmup_stable_windows)
        {
            bWarmedup = true;
            breath_state = BreathAnalyzerState::Ready;
            baseline_stable_count = 0;
            fmt::print("Warmup complete (baseline acquired)\n");
            return false;
        }

        breath_state = BreathAnalyzerState::Warmup;
        return false;
    }

    bool BreathAnalyzer::Ready(const WindowResult& breathwindow, BreathResult& breathresult, double start_threshold)
    {
        if(breathwindow.mean < start_threshold){return false;}

        breath_state = BreathAnalyzerState::Processing;
        breath_start_us = (breathwindow.window_start_us != 0) ? breathwindow.window_start_us : breathwindow.window_end_us;

        cur_peak_voltage = breathwindow.mean;
        breathresult.peak_volts = cur_peak_voltage;

        cooldown_stable_count = 0;

        return false;

    }

    bool BreathAnalyzer::Processing(const WindowResult& breathwindow, BreathResult& breathresult, double end_threshold, BreathEvent& out_event)
    {
        cur_peak_voltage = std::max(cur_peak_voltage,breathwindow.mean);
        breathresult.peak_volts = cur_peak_voltage;

        const uint64_t elapsed = breathwindow.window_end_us - breath_start_us;
        const bool falling_edge = (breathwindow.mean <= end_threshold);
        const bool blowtimeout = (elapsed >= bcfg.max_blow_time_us);

        if(!falling_edge && !blowtimeout)
        {
            return false;
        }

        if(elapsed < bcfg.min_blow_time_us)
        {
            breath_state = BreathAnalyzerState::Cooldown;
            cooldown_start_us = breathwindow.window_end_us;
            cooldown_stable_count = 0;
            return false;
        }
        
        out_event.start_us = breath_start_us;
        out_event.end_us = breathwindow.window_end_us;
        out_event.peak_voltage = cur_peak_voltage;

        analyzed_end_us = breathwindow.window_end_us;

        breath_state = BreathAnalyzerState::Analyzed;

        return true;
    }

    bool BreathAnalyzer::Cooldown(const WindowResult& breathwindow, BreathResult& breathresult, double ready_threshold)
    {
        if (breathwindow.stable && breathwindow.mean <= ready_threshold)
        {
            cooldown_stable_count++;
            if (cooldown_stable_count >= bcfg.cooldown_stable_windows)
            {
                fmt::print("Cooldown Completed!\n");
                breath_state = BreathAnalyzerState::Ready;
                cooldown_stable_count = 0;
                cur_peak_voltage = 0.0;
                breathresult.peak_volts = 0.0;
            }
        }
        else
        {
            cooldown_stable_count = 0;
        }

        return false;
    }
}