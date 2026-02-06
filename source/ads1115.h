#pragma once
#include <memory>
extern "C" 
{
    #include <i2c/smbus.h> // option if you want smbus for reading bytes I warn against SMBUS. Pretty sure its not supported with ADS1115
}

#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <cerrno>

// Used for i2c Port
#include <unistd.h>	
#include <fcntl.h> // file open
#include <fmt/format.h>
#include <sys/ioctl.h>			
#include <linux/i2c-dev.h>		
#include <linux/i2c.h>

namespace DrunkAPI {

    class ADS1115 final
    {
        public:
            using i2c_handle = int;
            ADS1115(const ADS1115&) = delete;
            ADS1115& operator=(const ADS1115&) = delete;
            ADS1115& operator=(ADS1115&&) = delete;
            ADS1115(ADS1115&&) = delete;
            
        /* Begin ADS115 Data Sheet Register Descriptors*/
            // https://www.ti.com/lit/ds/symlink/ads1115.pdf
            // Address pointer register values
            enum struct Reg : uint8_t {
                Conversion = 0x00,
                Config     = 0x01,
                LoThresh   = 0x02,
                HiThresh   = 0x03
            };

            // Config fields (ADS1115)
            enum struct Mode : uint16_t {
                Continuous = 0U << 8,
                SingleShot = 1U << 8
            };
            // Default use AI0 -> GND
            enum struct Mux : uint16_t {
                AIN0_GND = 0b100U << 12,
                AIN1_GND = 0b101U << 12,
                AIN2_GND = 0b110U << 12,
                AIN3_GND = 0b111U << 12,
            };
            // 0-3.3v voltage divided hence FS_4_096v is used
            enum struct Pga : uint16_t {
                FS_6_144V = 0b000U << 9,
                FS_4_096V = 0b001U << 9,
                FS_2_048V = 0b010U << 9,
                FS_1_024V = 0b011U << 9,
                FS_0_512V = 0b100U << 9,
                FS_0_256V = 0b101U << 9
            };
            // Default is SPS-128
            enum struct DataRate : uint8_t {
                SPS_8   = 0b000U << 5,
                SPS_16  = 0b001U << 5,
                SPS_32  = 0b010U << 5,
                SPS_64  = 0b011U << 5,
                SPS_128 = 0b100U << 5,
                SPS_250 = 0b101U << 5,
                SPS_475 = 0b110U << 5,
                SPS_860 = 0b111U << 5
            };
            // Can be used if you want some hardware interrupt on the GPIO pin
            enum struct CompQueue : uint8_t {
                Assert1 = 0b00U,
                Assert2 = 0b01U,
                Assert4 = 0b10U,
                Disable = 0b11U
            };
        /* End ADS115 Data Sheet Register Descriptors*/

            struct i2c_device
            {
                i2c_handle handle = -1;
                // ADS Pointer Starting Address Low/high
                i2c_device() = default;
                i2c_device(const i2c_device&) = delete;
                i2c_device& operator=(const i2c_device&) = delete;
                i2c_device(i2c_device&&) = delete;
                i2c_device& operator=(i2c_device&&) = delete;

                enum struct SlaveAddress : uint8_t
                {
                    ADDR_GND = 0x48,
                    ADDR_VDD = 0x49
                };

                i2c_handle open_i2c_device(int device_num, SlaveAddress device_address);

                static void close(i2c_handle handle)
                {
                    ::close(handle);
                }

                ~i2c_device() 
                {
                    if(handle >=0)
                    {
                        close(handle);
                    }
                }
            };

            ADS1115() = default;

            // Build a config word 
            static constexpr uint16_t MakeConfig(
                Mux mux,
                Pga pga,
                Mode mode,
                DataRate drate,
                CompQueue cqueue = CompQueue::Disable)
            {
                // Comparator defaults: traditional, active low, non-latching (if using interrupt alrt/rdy pin)
                constexpr std::uint16_t COMP_MODE_TRAD = 0U << 4;
                constexpr std::uint16_t COMP_POL_LOW   = 0U << 3;
                constexpr std::uint16_t COMP_LAT_NON   = 0U << 2;

                // Pack bits for Config register.
                return static_cast<std::uint16_t>(mux)
                    | static_cast<std::uint16_t>(pga)
                    | static_cast<std::uint16_t>(mode)
                    | static_cast<std::uint16_t>(drate)
                    | COMP_MODE_TRAD
                    | COMP_POL_LOW
                    | COMP_LAT_NON
                    | static_cast<std::uint16_t>(cqueue);
            }

            static constexpr uint16_t StartSingleConversion(uint16_t cfg)
            {
                constexpr uint8_t OS_BITSHIFT = 15;
                return cfg | (1U << OS_BITSHIFT); // OS bit
            }

            bool Init(int dev_num, i2c_device::SlaveAddress dev_adr);
            bool ReadSingleShot(i2c_device::SlaveAddress s_address,Mux mux,Pga pga, DataRate daterate, uint16_t& out_raw) const;
    
            static double Convert_Volts_FS4_096(uint16_t raw_u16)
            {
                int16_t raw = static_cast<int16_t>(raw_u16);
                constexpr double FS_4_096V = 4.096;
                constexpr double Step_Div =  32768.0;
                return static_cast<double>(raw) * (FS_4_096V / Step_Div); 
            }

            // Used to find a dynamic polling depending on data rate passed.
            static constexpr int Get_SpsRate(ADS1115::DataRate datarate)
            {
                constexpr int Rate_lookup[8] = {8,16,32,64,128,250,475,860};
                constexpr std::uint8_t Mask3Bits = 0x07; // 0000 0111
                const uint8_t idx = (static_cast<uint8_t>(datarate) >> 5) & Mask3Bits; // extract last 3 bits

                return Rate_lookup[idx];
            }

            static constexpr int ConversionTimeMs(ADS1115::DataRate datarate)
            {
                const int sps_rate = Get_SpsRate(datarate);
                return (1000 + sps_rate - 1) / sps_rate; // Ceil tricks: by subtracting -1 we can avoid rounding when dividing by just 1000
            }

            bool i2c_write_word(i2c_device::SlaveAddress s_address, uint8_t reg, uint16_t value) const;
            bool i2c_read_word(i2c_device::SlaveAddress s_address, uint8_t reg, uint16_t& out_conversion) const;
           
            std::unique_ptr<i2c_device> dev = nullptr;
    };

}

