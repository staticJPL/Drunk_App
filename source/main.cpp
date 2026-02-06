#include "ads1115.h"
#include "processor_traits.h"
#include "processor_types.h"
#include <cstdio>
#include <fmt/core.h>
#include <gpiod.h>
#include <csignal>
#include <sys/socket.h>
#include <unistd.h>
//#include <atomic>
// atomic to wrap the sigint call if main thread is concurrently processing something. Access to it can happen anytime
// thus an atomic is used. According to my research we can use volatile std::sig_atomic_t g_sigint_count = 0; but w/e
/* static std::atomic<int> g_sigint_count{0};
static std::atomic<bool> g_exit_requested{false};

static void on_sigint(int result)  { g_sigint_count.fetch_add(1); }
static void on_sigterm(int result) { g_exit_requested.store(true); g_sigint_count.store(2); } */

using CalibrationProcess = DrunkAPI::CalibrationProcess;
using RuntimeProcess = DrunkAPI::RuntimeProcess;

int main()
{
    std::setvbuf(stdout,nullptr,_IOFBF,0);
    // OS Callbacks for Kill
    //std::signal(SIGINT,  on_sigint);
    //std::signal(SIGTERM, on_sigterm);

    // Set your Ads1115 slave Address
    auto s_address = DrunkAPI::ADS1115::i2c_device::SlaveAddress::ADDR_GND;

    // Uncomment if Calibrating
    int status = DrunkAPI::RunSession<CalibrationProcess>(s_address);

    // Uncomment After Calibrated.
    //int status = DrunkAPI::RunSession<RuntimeProcess>(s_address);

    /*  TCP_config host_config;
        DrunkAPI::CSVNet CsvSink{host_config};
        CsvSink.Connect();
    */
    return status;
}
