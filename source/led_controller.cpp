#include "led_controller.h"
#include "gpio_bank.h"
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <gpiod.h>
#include <algorithm>
#include <thread>

namespace DrunkAPI
{
    void LedController::SetLed(LedType type, gpiod_line_value state)
    {
        const LineRequest& Linereq = LedBank.GetLineRequest();
        const LedPins& led_info = LedBank.GetLedInfo();

        if(!Linereq){std::perror("Error: Line Request Invalid Set Failed"); return;}
        if(led_info.empty()){std::perror("Error: Led Array Empty"); return;}

        size_t idx = LedToIndex(type);
        if(idx > led_info.size()){return;}
        auto* req = Linereq.get();
        gpiod_line_request_set_value(req, led_info[idx].gpio_pin, state);
      
    }

    void LedController::Clear()
    {
        for(Led_Info led: LedBank.GetLedInfo())
        {
            SetLed(led.Type,GPIOD_LINE_VALUE_INACTIVE);
        }
    }
    
    void LedController::EnableAll()
    {
        for(Led_Info led: LedBank.GetLedInfo())
        {
            SetLed(led.Type,GPIOD_LINE_VALUE_ACTIVE);
        }
    }

    void LedController::ApplyMask(uint8_t mask)
    {
        for(int i = 0; i < static_cast<int>(LedBank.GetLedInfo().size()); ++i)
        {
            auto led = static_cast<LedType>(i);
            bool enable = (mask & (1U << i)) != 0;
            SetLed(led, enable ? GPIOD_LINE_VALUE_ACTIVE : GPIOD_LINE_VALUE_INACTIVE);
        }
    }

    void LedController::SweepLeds(std::chrono::milliseconds step)
    {
        Clear();
        // 0 -> n leds ON
        for (size_t i = 0; i < static_cast<size_t>(LedBank.GetLedInfo().size()); ++i)
        {
            SetLed(LedBank.GetLedInfo()[i].Type, GPIOD_LINE_VALUE_ACTIVE);
            std::this_thread::sleep_for(step);
        }

        // n -> 0 leds OFF
        for (size_t i = static_cast<size_t>(LedBank.GetLedInfo().size()) - 1; i-->0;)
        {
            SetLed(LedBank.GetLedInfo()[static_cast<std::size_t>(i)].Type, GPIOD_LINE_VALUE_INACTIVE);
            std::this_thread::sleep_for(step);
        }
    }

    void LedController::Blink(LedType led, uint32_t count, std::chrono::milliseconds on_time,std::chrono::milliseconds off_time)
    {
        // Start from a known state
        SetLed(led, GPIOD_LINE_VALUE_INACTIVE);

        for (uint32_t i = 0; i < count; ++i)
        {
            SetLed(led, GPIOD_LINE_VALUE_ACTIVE);
            std::this_thread::sleep_for(on_time);

            SetLed(led, GPIOD_LINE_VALUE_INACTIVE);
            std::this_thread::sleep_for(off_time);
        }
    }

    void LedController::BlinkAll(std::uint32_t count, std::chrono::milliseconds on_time, std::chrono::milliseconds off_time)
    {
        const auto& leds = LedBank.GetLedInfo();
        if (leds.empty()){return;}

        auto set_all = [&](gpiod_line_value line_value)
        {
            for (const auto& led : leds)
            {
                SetLed(led.Type, line_value);
            }
        };

        for (std::uint32_t i = 0; i < count; ++i)
        {
            set_all(GPIOD_LINE_VALUE_ACTIVE);
            std::this_thread::sleep_for(on_time);

            set_all(GPIOD_LINE_VALUE_INACTIVE);
            std::this_thread::sleep_for(off_time);
        }
    }

    void LedController::DriveBAC(double bac_percent,std::chrono::seconds hold_time)
    {
        constexpr double PumpStomach = 0.45;
        bac_percent = std::clamp(bac_percent, 0.0, PumpStomach); 

        // BAC thresholds
        constexpr double No_Impariment = 0.02;
        constexpr double Slightly_Tipsy = 0.05;
        constexpr double Drunk = 0.08;

        std::uint8_t mask = 0;

        if (bac_percent < No_Impariment)
        {
            mask = LedMask::M_Green;
        }
        else if (bac_percent < Slightly_Tipsy)
        {
            mask = LedMask::M_Green | LedMask::M_Yellow;
        }
        else if (bac_percent < Drunk)
        {
            mask = LedMask::M_Green | LedMask::M_Yellow | LedMask::M_Orange;
        }
        else
        {
            mask = LedMask::M_Green | LedMask::M_Yellow | LedMask::M_Orange | LedMask::M_Red;
        }

        ApplyMask(mask);
        std::this_thread::sleep_for(hold_time);
    }
}
    