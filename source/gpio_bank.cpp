#include <gpiod.h>
#include "gpio_bank.h"

namespace DrunkAPI 
{
    bool GPIOBank::Init(const char* consumer)
    {
        // Get Chip pointer
        chip_interface = Chip{gpiod_chip_open(chipdevice)};

        if (!chip_interface)
        {
            fmt::print(stderr, "Error: gpiod_chip_open failed: {}\n", std::strerror(errno));
            return false;
        }

        line_config = LineConfig(gpiod_line_config_new());
        line_settings = LineSettings(gpiod_line_settings_new());
        request_config = RequestConfig(gpiod_request_config_new());

        if (!line_settings || !line_config || !request_config)
        {
            fmt::print(stderr, "Error: gpiod_*_new failed: {}\n", std::strerror(errno));
            return false;
        }
        
        // Setup Line Settings
        gpiod_line_settings_set_direction(line_settings.get(), GPIOD_LINE_DIRECTION_OUTPUT);
        gpiod_line_settings_set_output_value(line_settings.get(), GPIOD_LINE_VALUE_INACTIVE);

        if (Leds.empty())
        {
            fmt::print(stderr, "Error: Empty LED pins array\n");
            return false;
        }

        std::array<unsigned int, Default_LedArray.size()> offsets = MakeOffset(Leds);

        gpiod_line_config_add_line_settings(
            line_config.get(),
            offsets.data(),
            offsets.size(),
            line_settings.get()
        );

        gpiod_request_config_set_consumer(request_config.get(), consumer);

        request_interface = LineRequest(
            gpiod_chip_request_lines(
                chip_interface.get(),
                request_config.get(),
                line_config.get()
            )
        );

        if (!request_interface)
        {
            fmt::print(stderr, "Error: Failed to create Line Request Interface: {}\n", std::strerror(errno));
            return false;
        }

        fmt::print("Hardware Init: GPIO Initialization Successful!\n");
        return true;
    }

    std::array<unsigned int, Default_LedArray.size()> 
    GPIOBank::MakeOffset(const LedPins& leds)
    {
        std::array<unsigned int, Default_LedArray.size()> offsets{};

        for (std::size_t i = 0; i < offsets.size(); ++i)
        {
            offsets[i] = leds[i].gpio_pin;
        }

        return offsets;
    }
}

