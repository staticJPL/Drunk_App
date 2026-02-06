#pragma once
#include "gpiod.h"
#include <array>
#include <cstdint>
#include <memory.h>
#include <cstdio>
#include <memory>
#include <fmt/core.h>
struct LineSettingsDeleter 
{
    void operator()(gpiod_line_settings* ptr) const noexcept 
    {
        if (ptr != nullptr){gpiod_line_settings_free(ptr);}
    }
};

struct LineConfigDeleter 
{
    void operator()(gpiod_line_config* ptr) const noexcept 
    {
        if (ptr != nullptr) {gpiod_line_config_free(ptr);}
    }
};

struct RequestConfigDeleter 
{
    void operator()(gpiod_request_config* ptr) const noexcept
    {
        if (ptr != nullptr) {gpiod_request_config_free(ptr);}
    }
};

struct ChipDeleter {
    void operator()(gpiod_chip* ptr) const noexcept 
    {
        if (ptr != nullptr) {gpiod_chip_close(ptr);}
    }
};

struct LineRequestDeleter {
    void operator()(gpiod_line_request* ptr) const noexcept 
    {
        if (ptr != nullptr) {gpiod_line_request_release(ptr);}
    }
};

enum class LedType : uint8_t
{
    Blue = 0, // Ready
    Green = 1, // Sober
    Yellow = 2, // Light
    Orange = 3, // Tipsy
    Red = 4, // Drunk
};

struct Led_Info
{
    unsigned int gpio_pin;
    LedType Type;
};

constexpr uint8_t NUM_PINS = 5; 
using LineSettings = std::unique_ptr<gpiod_line_settings, LineSettingsDeleter>;
using LineConfig  = std::unique_ptr<gpiod_line_config,   LineConfigDeleter>;
using RequestConfig = std::unique_ptr<gpiod_request_config,  RequestConfigDeleter>;
using Chip        = std::unique_ptr<gpiod_chip,          ChipDeleter>;
using LineRequest  = std::unique_ptr<gpiod_line_request,  LineRequestDeleter>;
using LedPins = std::array<Led_Info, NUM_PINS>;

inline constexpr LedPins Default_LedArray = {{
    { 26, LedType::Blue}, // white wire  -> gpio26 BLUE (1)
    { 17, LedType::Green}, // orange wire -> gpio17 GREEN (2)
    { 27, LedType::Yellow}, // orange wire -> gpio27 ORANGE (3)
    { 22, LedType::Orange}, // yellow wire -> gpio22 ORANGE (4)
    { 16, LedType::Red}, // yellow wire -> gpio16 RED (5)
}};

namespace DrunkAPI
{
    class GPIOBank final
    {
        public:
            // Make sure you find your chip path
            GPIOBank(const char* chipPath = "/dev/gpiochip0") : chipdevice(chipPath), Leds(Default_LedArray){}
            // Non Copyable
            GPIOBank(const GPIOBank&) = delete;
            // No Assignment
            GPIOBank& operator=(const GPIOBank&) = delete;
            GPIOBank& operator=(const GPIOBank&&) = delete;
            // No Move. Keep this In Scope in which it's used.
            GPIOBank(GPIOBank&&) = delete;
            

            [[nodiscard]] bool Init(const char* consumer = "drunk_app");

            const LineRequest& GetLineRequest() const noexcept
            {
                return request_interface;
            }

            const LedPins& GetLedInfo() const noexcept
            {
                return Leds;
            }

        private:

            static std::array<unsigned int, Default_LedArray.size()> MakeOffset(const LedPins& leds);

            const char* chipdevice;
            LedPins Leds;
            LineSettings line_settings = nullptr;
            Chip chip_interface = nullptr;
            LineConfig line_config = nullptr;
            RequestConfig request_config = nullptr;        
            LineRequest request_interface = nullptr;
    };

};