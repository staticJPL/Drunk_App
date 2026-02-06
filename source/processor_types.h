#pragma once
#include "config_settings.h"
#include "led_controller.h"
#include "mq3_helper.h"
#include "process_runner.h"
#include "analyzer.h"
#include "sampler.h"
#include <chrono>
#include <cstdint>
#include <cstdio>
#include <fmt/core.h>
#include <thread>

namespace DrunkAPI 
{ 
    template<class ProcessorT>
    struct HardwareContext;

    auto get_volts = +[](const Sample& sample)->double { return sample.volts; };

    class CalibrationProcess final
    {
        public:
        explicit CalibrationProcess(Analyzer_Config cfg) : analyzer_(cfg) {}

        CalibrationProcess(const CalibrationProcess&) = delete;
        CalibrationProcess& operator=(const CalibrationProcess&) = delete;
        CalibrationProcess(CalibrationProcess&&) = delete;
        CalibrationProcess& operator=(CalibrationProcess&&) = delete;


        StepResult<WindowResult> on_batch(const Sample* sample, size_t n) 
        {
        
            StepResult<WindowResult> step = analyzer_.AnalyzeBatch(sample, n, get_volts);
        
            if (step.result.window_end_us != 0) 
            {
                fmt::print("Window mean={:.6f}V sd={:.6f}V drift={:.6f}V/s stable={}\n",
                    step.result.mean, 
                    step.result.stddev, 
                    step.result.drift_per_sec, 
                    step.result.stable);
                    
                last_ = step.result;
            }

            if(step.result.stable)
            {
                fmt::print("Stable Value Found! mean={:.6f}\n", step.result.mean);
                step.action = StateAction::Done;
                return step;
            } 

            return step;
        }

        WindowResult result() const { return last_; }
        WelfordAnalyzer analyzer_;

        private:
        WindowResult last_{};
    };

    class RuntimeProcess final
    {
        public:
        explicit RuntimeProcess(Analyzer_Config cfg, BreathAnalyzer_Config bcfg) : W_analyzer_(cfg), B_analyzer_(bcfg) {}

        RuntimeProcess(const RuntimeProcess&) = delete;
        RuntimeProcess& operator=(const RuntimeProcess&) = delete;
        RuntimeProcess(RuntimeProcess&&) = delete;
        RuntimeProcess& operator=(RuntimeProcess&&) = delete;

        static constexpr bool bEnableTimeout = false; // compile out timeout runner process during runtime

        StepResult<BreathResult> on_batch(const Sample* sample, size_t n)
        {   
            StepResult<BreathResult> out{};

            out.action = StateAction::Continue;
            out.event = StateEvent::None;
            out.result = snapshot_;

            StepResult<WindowResult> step = W_analyzer_.AnalyzeBatch(sample ,n , get_volts);
            
            // Window Finalized so the breath analyzer can consume a new window.
            if(step.result.window_end_us != 0)
            {
                out.result.last_window = step.result;
                BreathEvent breath_event{};

                B_analyzer_.AnalyzeBreath(out.result.last_window, out.result, breath_event);
                
                out.event = static_cast<ProcessState::Event>(breath_event.State); // Pass through the state up to the Event Callback

                last_event = breath_event;
                bHasEvent = true;

                //fmt::print("Breath Event State: {}\n",static_cast<int>(breath_event.State));
            }

            snapshot_ = out.result;
            return out;
        }

        bool pop_breath_event(BreathEvent& out)
        {
            if(!bHasEvent){return false;}

            out = last_event;
            bHasEvent = false;

            return true;
        }

         BreathResult result() const { return snapshot_; }

    private:
       WelfordAnalyzer W_analyzer_;
       BreathAnalyzer  B_analyzer_;
       BreathResult snapshot_{};

       bool bHasEvent = false;
       BreathEvent last_event{};
       
    }; 

    template<class ProcessorT>
    static int StartCalibration(HardwareContext<ProcessorT>& SessionContext)
    {   
        std::setvbuf(stdout,nullptr,_IOFBF,0);

        auto& runner = SessionContext.runner;
        auto& calibrator = SessionContext.processor;
        auto& Led_indicator = SessionContext.led_ctrl;
        auto result = runner.run();

        if(result.stable)
        {   
            auto calibrator_cfg = calibrator.analyzer_.Get_AnalyzerConfg();
            auto Rs_stable = DrunkAPI::MQ3::adc3v3_to_rs(result.mean,calibrator_cfg.RL);
            auto Rs_Ro_ratio = DrunkAPI::MQ3::rs_to_ratio(Rs_stable, calibrator_cfg.Ro_Air);

            Led_indicator.ApplyMask(M_Green); // Succcess

            fmt::print("RS Stable found = {:.6f} Ohms\n", Rs_stable);
            fmt::print("Rs/Ro: {:.6f}\n",Rs_Ro_ratio);
            constexpr uint8_t result_timeout = 5;
            std::this_thread::sleep_for(std::chrono::seconds(result_timeout)); // sleep for 5 seconds after result is found and return.
        }

        return 0;
    }

    template <class ProcessorT>
    static int StartRuntime(HardwareContext<ProcessorT>& SessionContext)
    {
        std::setvbuf(stdout,nullptr,_IOFBF,0);

        auto& Led_indicator = SessionContext.led_ctrl;
        LedWorker led_worker(Led_indicator);

        auto on_breath = [&](ProcessorT& processor)
        {
            BreathEvent event{};
            while (processor.pop_breath_event(event))
            {
                // Map breath state
                switch (event.State)
                {
                    case BreathAnalyzerState::Warmup:
                    {
                        fmt::print("Warming up... (Finding baseline)\n");
                        std::chrono::milliseconds in_on(500);
                        std::chrono::milliseconds in_off(500);
                        led_worker.SetState(LedState::Warmup);
                        led_worker.Apply_Command({.type = LedCommandType::BlinkOne,.count=2,.on=in_on,.off=in_off});
                        break;
                    }
                    case BreathAnalyzerState::Ready:
                        fmt::print("MQ3 Ready for analysis...\n");
                        led_worker.SetState(LedState::Ready);
                        led_worker.Apply_Command({ .type = LedCommandType::Mask, .led_mask = LedMask::M_Blue });
                        break;

                    case BreathAnalyzerState::Processing:
                    {
                        fmt::print("Processed...\n");
                        std::chrono::milliseconds in_on(200);
                        std::chrono::milliseconds in_off(200);
                        led_worker.SetState(LedState::Processing);
                        led_worker.Apply_Command({.type = LedCommandType::BlinkAll,.count=3,.on=in_on,.off=in_off});
                        break;
                    }

                    case BreathAnalyzerState::Cooldown:
                    {
                        fmt::print("Cooling Down...\n");
                        std::chrono::milliseconds in_on(500);
                        std::chrono::milliseconds in_off(500);
                        led_worker.SetState(LedState::Cooldown);
                        led_worker.Apply_Command({.type = LedCommandType::BlinkOne,.count=2,.on=in_on,.off=in_off,});
                        break;
                    }

                    case BreathAnalyzerState::Analyzed:
                    {
                        fmt::print("Breath Alcohol Detected: Peak = {:.6f}V\n", event.peak_voltage);

                        const auto Rs_Peak = MQ3::adc3v3_to_rs(event.peak_voltage, Config::RLoad);
                        const auto ratio   = MQ3::rs_to_ratio(Rs_Peak, Config::Ro_Air);

                        const double conc  = MQ3::calculate_concentration_exp(ratio);
                        const double ppm   = MQ3::calculate_ppm(conc);
                        const double bac   = MQ3::calculate_bac(ppm);
                        fmt::print("Concentration: {:.6f}mg/l\n", ppm);
                        fmt::print("PPM Ethanol: {:.6f}\n", ppm);
                        fmt::print("BAC: {:.6f}\n", bac);

                        // BAC holds LED result so user can see the result.
                        led_worker.Apply_Command({
                            .type = LedCommandType::DriveBac,
                            .bac = bac,
                            .bac_holdtime = std::chrono::seconds(10)
                        });

                        break;
                    }

                    default:
                        break;
                }
            }
        };

        SessionContext.runner.run(on_breath);
        return 0;
    }
}