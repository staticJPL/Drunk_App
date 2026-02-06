#pragma once
#include <cstddef>
#include <cstdio>
#include <fmt/core.h>
#include <sys/socket.h>
#include <unistd.h>
#include <vector>
#include "config_settings.h"
#include "sampler.h"
#include "data_sink.h"

namespace DrunkAPI::ProcessState 
{
    enum class StateAction : std::uint8_t { Continue, Done, Abort };

    enum class Event: std::uint8_t{None, Warmup, Ready, Processing, Cooldown,Analyzed};

    template <typename ResultT>
    struct StepResult
    {
        StateAction action = StateAction::Continue;
        Event event = Event::None;
        ResultT result{}; // snapshot of most recent sampling window
    };
}

using StateAction = DrunkAPI::ProcessState::StateAction;
using StateEvent = DrunkAPI::ProcessState::Event;
template <typename ResultT>
using StepResult = DrunkAPI::ProcessState::StepResult<ResultT>;

namespace DrunkAPI 
{
    static std::atomic<bool> g_running{true};

    template<class Sampler, class Processor>
    class ProcessRunner
    {
        public:
            ProcessRunner(Sampler& in_sampler, Consumer_Config in_consumer_config, Processor& in_processor)
            :   sampler(in_sampler), consumer_config(in_consumer_config), processor(in_processor), batch(DrunkAPI::Config::ConsumerMaxBatch){}
            
            ProcessRunner(const ProcessRunner&) = delete;
            ProcessRunner& operator=(const ProcessRunner&) = delete;
            ProcessRunner(ProcessRunner&&) = delete;
            ProcessRunner& operator=(ProcessRunner&&) = delete;

            template<class ProcessCallback>
            auto run(ProcessCallback&& on_process_event) 
            {
                sampler.start_sampler();
                
                // Ensure batch has actual elements
                if (batch.size() < consumer_config.max_batch)
                {
                    batch.resize(consumer_config.max_batch);
                }

                auto start = std::chrono::steady_clock::now();

                while (g_running.load(std::memory_order_relaxed)) 
                {
                    size_t num_of_samples = sampler.buffer().pop_batch(batch.data(), consumer_config.max_batch);

                    if (num_of_samples == 0) 
                    {
                        std::this_thread::sleep_for(consumer_config.consumer_idle_sleep);

                        // idle 
                        if constexpr (bEnableTimeout<Processor>())
                        {
                            if (std::chrono::steady_clock::now() - start >= consumer_config.Timeout)
                            {
                                return processor.result();
                            }
                        }
                        continue;
                    }

                    // Processor on_batch handles its own state based and we exit out here.

                    // To-Do Exit on State.
                    auto cur_step = processor.on_batch(batch.data(),num_of_samples);

                    // Fire off an event to the lambda
                    if (cur_step.event != StateEvent::None)
                    {
                        on_process_event(processor);
                    }

                    switch (cur_step.action)
                    {
                        case StateAction::Continue:
                            break; // keep running
                        case StateAction::Done:
                        case StateAction::Abort:
                            return processor.result();
                    }

                    std::this_thread::sleep_for(consumer_config.consumer_tick_sleep);

                    // Slapping a type check here so calibration uses a timeout.
                    if constexpr (bEnableTimeout<Processor>())
                    {
                        if (std::chrono::steady_clock::now() - start >= consumer_config.Timeout) 
                        {
                            fmt::print("Timeout.\n");
                            return processor.result(); // timed out; return best info so far
                        }
                    }

                    ::fflush(stdout);
                }

                return processor.result(); // stopped via signal
            }

            // No Callback.
            auto run()
            {
                return run([](Processor&){});
            }

            template<class ProcessorT>
            static consteval bool bEnableTimeout()
            {
                if constexpr (requires { ProcessorT::bEnableTimeout; })
                {
                    return ProcessorT::bEnableTimeout;
                }
                
                return true;
            }

            ~ProcessRunner(){sampler.stop_sampler();}


        private:
            Sampler& sampler;
            Consumer_Config consumer_config;
            Processor& processor;
            std::vector<DrunkAPI::Sample> batch;
    };

    // Helper if you want to Export Values to CSV file via NCat to your main machine if desired. Allows the ability to collect row sample data, could be useful for creating test data.
    // and it saves writes to Pi's Micro SD.

    class CSVNet
    {
        public:

            explicit CSVNet(TCP_config& cfg) : connection_cfg(cfg) {}

            bool Connect()
            {
                socket_handle = DrunkAPI::tcp_connect(connection_cfg.HOST_IP.c_str(), connection_cfg.HOST_PORT);

                if(socket_handle >=0)
                {
                    fmt::print("Connected to {} Successfully \n", connection_cfg.HOST_IP);
                    return true;
                }
                    fmt::print("Failed to Connect to {}",connection_cfg.HOST_IP);
                    ::shutdown(socket_handle, SHUT_RDWR);
                    ::close(socket_handle);
                    return false;
            }

        /*  bool SendSample(StabilityResult StableSample)
            {
                static constexpr int LINESIZE = 128;

                char dataline[LINESIZE]; 

                out_stream.clear(); // flush stream before sending.

                int chars = std::snprintf(dataline,
                    sizeof(dataline),
                    "%.6f\n",
                    StableSample.mean);
                    out_stream.append(dataline,static_cast<size_t>(chars));

                    return DrunkAPI::tcp_send_batch(socket_handle, out_stream.data(), out_stream.size());
            } 
        */

            ~CSVNet()
            {
                ::shutdown(socket_handle, SHUT_RDWR);
                ::close(socket_handle);
            }

        private:

            int socket_handle = 0;
            TCP_config& connection_cfg;
            std::string out_stream;
    };

}