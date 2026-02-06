#pragma once
#include <fmt/core.h>
#include <type_traits>
#include <cstdint>
#include "ads1115.h"
#include "processor_types.h"
#include "sampler.h"

namespace DrunkAPI 
{
    enum class ProcessorMode : std::uint8_t
    {
        Calibration, // Used to find RS, Ro for Initial Calibration.
        Runtime, // Runtime BAC Service
    };

    template<class ProcessorT>
    struct ProcessorTraits
    {
        static ProcessorT make([[maybe_unused]] Analyzer_Config& analyzer_cfg, [[maybe_unused]] BreathAnalyzer_Config& breath_cfg)
        {
            static_assert(!std::is_same_v<ProcessorT, ProcessorT>,"ProcessorTraits not specialized for ProcessorT");
        }
    };

    template<class ProcessorT>
    inline constexpr ProcessorMode ProcessorMode_T = ProcessorTraits<ProcessorT>::mode;

    template<class ProcessorT>
    struct HardwareContext
    {
        GPIOBank gpio_bank;
        ADS1115 ads1115;
        LedController led_ctrl;

        Ads1115_Source source;
        Sampler<Ads1115_Source> sampler;

        Consumer_Config consumer_cfg{};
        Analyzer_Config analyzer_cfg{};
        BreathAnalyzer_Config breath_cfg{};
        ProcessorT processor;
        DrunkAPI::ProcessRunner<Sampler<Ads1115_Source>, ProcessorT> runner;

        HardwareContext(ADS1115::i2c_device::SlaveAddress addr)
            : led_ctrl(gpio_bank)
            , source(ads1115, addr,
                     ADS1115::Mux::AIN0_GND,
                     ADS1115::Pga::FS_4_096V,
                     ADS1115::DataRate::SPS_128)
            , sampler(source)
            , processor(ProcessorTraits<ProcessorT>::make(analyzer_cfg, breath_cfg))
            , runner(sampler, consumer_cfg, processor){}

    };

    template<class ProcessorT>
    static int SystemInit(HardwareContext<ProcessorT>& context, ADS1115::i2c_device::SlaveAddress addr)
    {

        if (!context.gpio_bank.Init())
        {
            std::perror("Critical Error: Failed to initialize LED GPIOs");
            return 1;
        }

        if (!context.ads1115.Init(1, addr))
        {
            std::perror("Critical Error: Failed to initialize ADC");
            return 1;
        }

        return 0;
    }

    template <class ProcessorT>
    static int RunSession(DrunkAPI::ADS1115::i2c_device::SlaveAddress addr)
    {
        // Setup Configurations
        HardwareContext<ProcessorT> SessionContext(addr);
        
        // Intialize GPIO and ADS1115
        if(int init = SystemInit(SessionContext,addr) !=0)
        {
            return init;
        }

        if constexpr (ProcessorMode_T<ProcessorT> == ProcessorMode::Calibration) 
        {   
            return DrunkAPI::StartCalibration(SessionContext);
        }

        if constexpr (ProcessorMode_T<ProcessorT> == ProcessorMode::Runtime) 
        {
            return DrunkAPI::StartRuntime(SessionContext);
        }
        
        fmt::print("Error Failed to Run a Drunk Session!");
        return 1;
    }

    template<>
    struct ProcessorTraits<CalibrationProcess>
    {
        static constexpr ProcessorMode mode = ProcessorMode::Calibration;

        static CalibrationProcess make(Analyzer_Config& analyzer_cfg, [[maybe_unused]] BreathAnalyzer_Config& breath_cfg)
        {
            return CalibrationProcess(analyzer_cfg);
        }
    };

    template<>
    struct ProcessorTraits<RuntimeProcess>
    {
        static constexpr ProcessorMode mode = ProcessorMode::Runtime;

        static RuntimeProcess make(Analyzer_Config& analyzer_cfg, BreathAnalyzer_Config& breath_cfg)
        {
            return RuntimeProcess(analyzer_cfg, breath_cfg);
        }
    };


}

