#pragma once

#include <chrono>
#include <cstdint>
#include <thread>
#include "config_settings.h"
#include "spsc.h"
#include "ads1115.h"

namespace DrunkAPI
{
    struct SamplerConfg
    {
        std::chrono::microseconds sample_rate{DrunkAPI::Config::SamplePeriod};
    };

    struct Sample
    {
        uint64_t t_us;
        int16_t  raw;
        float    volts;
    };

    struct Ads1115_Source
    {
        DrunkAPI::ADS1115& ads;

        DrunkAPI::ADS1115::i2c_device::SlaveAddress addr;
        DrunkAPI::ADS1115::Mux mux;
        DrunkAPI::ADS1115::Pga pga;
        DrunkAPI::ADS1115::DataRate rate;

        Ads1115_Source(DrunkAPI::ADS1115& ads_in,
                    DrunkAPI::ADS1115::i2c_device::SlaveAddress addr_in,
                    DrunkAPI::ADS1115::Mux mux_in,
                    DrunkAPI::ADS1115::Pga pga_in,
                    DrunkAPI::ADS1115::DataRate rate_in): ads(ads_in), addr(addr_in), mux(mux_in), pga(pga_in), rate(rate_in){}

        bool sample_value(Sample& out) const
        {
            uint16_t out_val = 0;
            if(!ads.ReadSingleShot(addr,mux,pga,rate,out_val)) {return false;}

            out.raw = static_cast<int16_t>(out_val);
            out.volts = static_cast<float>(DrunkAPI::ADS1115::Convert_Volts_FS4_096(out_val));

            // Set Monotonic timestamp
            auto duration = std::chrono::steady_clock::now().time_since_epoch();
            
            const uint64_t usec = static_cast<uint64_t>(std::chrono::duration_cast<std::chrono::microseconds>(duration).count());
            out.t_us = usec;

            return true;
        }

    };

    template<class Source>
    class Sampler 
    {
        public:
            explicit Sampler(Source& src) : DataSource(src) {}

            Sampler(const Sampler&) = delete;
            Sampler& operator=(const Sampler&) = delete;
            Sampler(Sampler&&) = delete;
            Sampler& operator=(Sampler&&) = delete;

            ~Sampler() { stop_sampler(); }
            
            void start_sampler() {
                running.store(true);
                thread = std::thread([this]{ run_sampler(); });
            }

            void stop_sampler() {
                running.store(false);
                if (thread.joinable()) {thread.join();}
            }

            // expose buffer to main/exporter
            SpscRing<Sample, DrunkAPI::Config::RingSize>& buffer() { return ring; }
            uint64_t dropped() const { return dropped_.load(); }

        private:
            void run_sampler() 
            {
                using namespace std::chrono;

                constexpr auto period = microseconds(DrunkAPI::Config::SamplePeriod);
                auto next = steady_clock::now(); // Using monotonic clock (Fixed timestep) similiar to game engine tick simulation to sample at a fixed rate. Wall clock is bad and can drift
                while (running.load(std::memory_order_relaxed)) 
                {
                    next += period; // Set next period to wait until

                    Sample sample{};
                    if (DataSource.sample_value(sample)) {
                        if (!ring.push_overwrite(sample)) {dropped_.fetch_add(1, std::memory_order_relaxed);}
                    }
                    std::this_thread::sleep_until(next);
                }
            }

            Source& DataSource;
            SpscRing<Sample, DrunkAPI::Config::RingSize> ring;
            std::atomic<bool> running{false};
            std::atomic<uint64_t> dropped_{0};
            std::thread thread;
    };
}