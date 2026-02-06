#include <chrono>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <fmt/format.h>
#include <linux/i2c-dev.h>
#include <memory>
#include <sys/ioctl.h>
#include <thread>
#include "ads1115.h"

namespace DrunkAPI {

    using i2c_handle = ADS1115::i2c_handle;
    using ADS1115_i2c = ADS1115::i2c_device;

    i2c_handle ADS1115_i2c::open_i2c_device(const int device_num, SlaveAddress device_address)
    {
        const auto filehandle = open(fmt::format("/dev/i2c-{}", device_num).c_str(),O_RDWR);

        if(filehandle < 0)
        {
            std::string errmsg = fmt::format("Unable to open /dev/i2c-{} for read/write",device_num);
            std::perror(errmsg.c_str());
            exit(1);
        }

        if(ioctl(filehandle, I2C_SLAVE, device_address) < 0)
        {
            std::string errmsg = fmt::format("Unable to set I2C_SLAVE addr to {}", static_cast<int>(device_address));
            std::perror(errmsg.c_str());
            exit(1);
        }

        //std::puts("i2c handle opened successfully");

        handle = filehandle;

        return filehandle;
    };
    
    bool ADS1115::Init(const int dev_num, i2c_device::SlaveAddress dev_adr)
    {
        if(!dev) {dev = std::make_unique<i2c_device>();}

        dev->handle = dev->open_i2c_device(dev_num,dev_adr);

        if(dev->handle >=0)
        {
            std::puts("Hardware Init: Ads1115 Handle Successful!");
            return true;
        } 

        std::perror("Error: Failed to initialize Ads1115 i2c!");
        dev.reset();
        return false;
    }

    bool ADS1115::i2c_write_word(
        i2c_device::SlaveAddress s_address, 
        uint8_t reg, 
        uint16_t value) const
    {
        if (!dev || dev->handle < 0){return false;}

        constexpr uint8_t LSB = 0XFF;
        constexpr uint8_t MSB = 8;

        std::uint8_t buf[3] = {
            reg,
            static_cast<std::uint8_t>(value >> MSB),  
            static_cast<std::uint8_t>(value & LSB)
        };

        i2c_msg msg{};
        msg.addr  = static_cast<std::uint16_t>(static_cast<std::uint8_t>(s_address));
        msg.flags = 0;   // write
        msg.len   = static_cast<__u16>(sizeof(buf));
        msg.buf   = buf;

        i2c_rdwr_ioctl_data xfer{};
        xfer.msgs  = &msg;
        xfer.nmsgs = 1;

        int status = ioctl(dev->handle, I2C_RDWR, &xfer);
        return status >= 0;
    }

    bool ADS1115::i2c_read_word(
        i2c_device::SlaveAddress s_address, 
        uint8_t reg, 
        uint16_t& out_conversion) const
    {
        if (!dev || dev->handle < 0) {return false;}

        uint8_t wbuf[1] = { reg };
        uint8_t rbuf[2] = { 0, 0 };

        i2c_msg msgs[2]{};
        msgs[0].addr  = static_cast<__u16>(s_address);
        msgs[0].flags = 0; // write config
        msgs[0].len = 1;
        msgs[0].buf   = wbuf;

        msgs[1].addr  = static_cast<__u16>(s_address);
        msgs[1].flags = I2C_M_RD; // read
        msgs[1].len   = 2;
        msgs[1].buf   = rbuf;

        i2c_rdwr_ioctl_data xfer{}; 
        xfer.msgs  = msgs;
        xfer.nmsgs = 2;

        if (ioctl(dev->handle, I2C_RDWR, &xfer) < 0) {
            std::fprintf(stderr, "I2C_RDWR read_reg16 failed: %s\n", std::strerror(errno));
            return false;
        }

        constexpr uint16_t MSB_SHIFT = 8;
        out_conversion = static_cast<std::uint16_t>((static_cast<std::uint16_t>(rbuf[0]) << MSB_SHIFT) | static_cast<std::uint16_t>(rbuf[1])); // MSB first
        return true;
    }
    
    bool ADS1115::ReadSingleShot(
        i2c_device::SlaveAddress s_address,
        Mux mux,
        Pga pga,
        DataRate daterate,
        uint16_t& out_raw
    ) const
    {
        // Create Config Object for a Single Shot Command (no pun intended)
        uint16_t config = MakeConfig(mux, pga, Mode::SingleShot, daterate, CompQueue::Disable);
        config  = StartSingleConversion(config);

        if(!i2c_write_word(s_address, static_cast<uint8_t>(Reg::Config),config))
        {
            return false;
        }

        // Determine poll interval
        const int conv_ms = ConversionTimeMs(daterate);
        
        // OS Scheduling + I2C latency margin. 2-
        const int margin_ms = 5;

        // Total wait time
        const int timeout_ms = conv_ms + margin_ms;

        // Set Poll Interval
        const int poll_ms = (conv_ms <= 2) ? 1 : 2; // 1 ms usually.

        const auto start = std::chrono::steady_clock::now();
        constexpr uint16_t OSMASK = 0x8000U;

        while(true)
        {
            // Check OS bit
            uint16_t read_cfg = 0;
            if (!i2c_read_word(s_address, static_cast<uint8_t>(Reg::Config), read_cfg))
            {
                return false;
            }

            if ((read_cfg & OSMASK) != 0U)
            {
                return i2c_read_word(s_address, static_cast<uint8_t>(Reg::Conversion), out_raw);
            }

            if (std::chrono::steady_clock::now() - start >= std::chrono::milliseconds(timeout_ms))
            {
                break;
            }

            std::this_thread::sleep_for(std::chrono::milliseconds(poll_ms));

        }

        return false;
    }

}

// Helper CLI ADC Test Commands
// sudo i2ctransfer -y 1 w3@0x48 0x01 0xC3 0x83 // Write Config if Address mode is GND
// sleep 0.02
// sudo i2ctransfer -y 1 w1@0x48 0x00 r2 // Read Command AIN0