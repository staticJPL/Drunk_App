#pragma once
#include "gpio_bank.h"
#include <chrono>
#include <condition_variable>
#include <cstddef>
#include <cstdint>
#include <gpiod.h>
#include <mutex>

namespace DrunkAPI
{
    enum class LedState : std::uint8_t
    {
        Warmup,
        Ready,
        Processing,
        Cooldown,
        Idle
    };

    enum class LedCommandType : std::uint8_t
    {
        Clear,
        Mask,
        BlinkOne,
        BlinkAll,
        DriveBac
    };

    enum LedMask : uint8_t
    {
        M_Blue = 1U << 0,
        M_Green = 1U << 1,
        M_Yellow = 1U << 2,
        M_Orange = 1U << 3,
        M_Red = 1U << 4,
    };


    // Command list for Led worker
    struct LedCommand
    {
        LedCommandType type = LedCommandType::Clear;

        // Mask
        std::uint8_t led_mask = 0;

        // Blink
        LedType led = LedType::Blue;
        std::uint32_t count = 0;
        std::chrono::milliseconds on{0};
        std::chrono::milliseconds off{0};

        // BAC
        double bac = 0.0;
        std::chrono::seconds bac_holdtime{0};
    };


    static constexpr uint8_t operator|(LedMask a, LedMask b) {
        return static_cast<uint8_t>(a) | static_cast<uint8_t>(b);
    }
    
    static constexpr size_t LedToIndex(LedType T)
    {
        return static_cast<size_t>(T);
    }

    class LedController final
    {
        public:
        LedController(const LedController&) = delete;
        LedController& operator=(const LedController&) = delete;
        LedController& operator=(LedController&&) = delete;
        LedController(LedController&&) = delete;
        
        explicit LedController(GPIOBank& bank) : LedBank(bank){}

        void SetLed(LedType type, gpiod_line_value state);

        void Clear();
        void EnableAll();

        void SweepLeds(std::chrono::milliseconds step);
        void ApplyMask(uint8_t mask);

        void Blink(LedType led, uint32_t count, std::chrono::milliseconds on_time,std::chrono::milliseconds off_time);
        void BlinkAll(std::uint32_t count, std::chrono::milliseconds on_time, std::chrono::milliseconds off_time);

        void DriveBAC(double bac_percent,std::chrono::seconds hold_time); // We cooldown after displaying BAC. Hold time is just how long to display Leds are BAC is computed
        
        private:

        GPIOBank& LedBank;
    };


    // Scope Guard to clear LED state
    struct LedScopeGuard
    {   
        DrunkAPI::LedController& led;
        ~LedScopeGuard(){led.Clear();}
    };

    // Added a LedWorker thread so we don't block our main consumer thread. Worker thread makes good use here.
    class LedWorker final
    {
        public:
        explicit LedWorker(LedController& in_ctrl) : led_ctrl(in_ctrl), led_thread([this]{ThreadRun();}){}

        LedWorker(const LedWorker&) = delete;
        LedWorker& operator=(const LedWorker&) = delete;
        LedWorker& operator=(LedWorker&&) = delete;
        LedWorker(LedWorker&&) = delete;
        
        ~LedWorker()
        {
            {
              std::lock_guard led_lock(mutex_);
              bStop = true;
            }

            conditional_V.notify_one();
            if(led_thread.joinable()){led_thread.join();}

            led_ctrl.Clear();
        }

        void SetState(LedState state)
        {
            {
                std::lock_guard led_lock(mutex_);
                current_state = state;
                state_dirty = true;
            }

            conditional_V.notify_one();
        }

        void Apply_Command(LedCommand cmd)
        {
            {
                std::lock_guard led_lock(mutex_);
                current_command = cmd;
                pending_command = true;
            }
            conditional_V.notify_one();
        }
        // Optional: useful if you want to directly cancel a current running command
        bool Cancel_Command()
        {
            {
                std::lock_guard led_lock(mutex_);
                return cancel_command;
            }
        }

        void Run_Command(const LedCommand& cmd)
        {
            switch (cmd.type)
            {
                case LedCommandType::Clear:
                    led_ctrl.Clear();
                    break;

                case LedCommandType::Mask:
                    led_ctrl.ApplyMask(cmd.led_mask);
                    break;

                case LedCommandType::BlinkOne:
                    for (std::uint32_t i = 0; i < cmd.count; ++i)
                    {
                        if (Cancel_Command()){return;}
                        led_ctrl.SetLed(cmd.led, GPIOD_LINE_VALUE_ACTIVE);
                        std::this_thread::sleep_for(cmd.on);

                        if (Cancel_Command()){return;}
                        led_ctrl.SetLed(cmd.led, GPIOD_LINE_VALUE_INACTIVE);
                        std::this_thread::sleep_for(cmd.off);
                    }
                    break;

                case LedCommandType::BlinkAll:
                    for (std::uint32_t i = 0; i < cmd.count; ++i)
                    {
                        if (Cancel_Command()){return;}
                        led_ctrl.ApplyMask(LedMask::M_Blue | LedMask::M_Green | LedMask::M_Yellow | LedMask::M_Orange | LedMask::M_Red);
                        std::this_thread::sleep_for(cmd.on);

                        if (Cancel_Command()){return;}
                        led_ctrl.Clear();
                        std::this_thread::sleep_for(cmd.off);
                    }
                    break;

                case LedCommandType::DriveBac:
                {
                    // Hold BAC Led output exclusively. This is blocking and it's what I want, this allows the user to see thier BAC result.
                    led_ctrl.DriveBAC(cmd.bac, cmd.bac_holdtime);
                    break;
                }
            }
        }

        private:
        void ThreadRun()
        {
            LedState last_applied_state = LedState::Idle;
            while (true)
            {   
                // Copy variables into our lock and then execute
                LedCommand command{};
                bool do_command = false;
                LedState thread_state = LedState::Idle;
                bool do_state = false;

                // Lock Scope
                {
                    std::unique_lock led_lock(mutex_); // Conditional
                    // Sleep thread until Notify is fired.
                    conditional_V.wait(led_lock,[&]{return bStop || pending_command || state_dirty;});
                    if(bStop){break;}

                    if(pending_command)
                    {
                        command = current_command;
                        pending_command = false;
                        do_command = true;
                        cancel_command = false;
                    }
                    else if (state_dirty) 
                    {
                        thread_state = current_state; // update incoming state
                        state_dirty = false;
                        do_state = true;
                    }
                }

                if(do_command)
                {
                    Run_Command(command); // set pending state back to true.
                    // After command ends, stomp to the latest state received by our consumer.
                    LedState stomp_state{}; // LED thread stack variable
                    // Lock Scope
                    {
                        std::lock_guard led_lock(mutex_);
                        stomp_state = current_state;
                    }

                    ApplyState(stomp_state, last_applied_state);
                }
                else if (do_state) 
                {
                    ApplyState(thread_state,last_applied_state);
                }
            }
        }

        void ApplyState(LedState in_state, LedState& last_applied_state)
        {
            if (in_state == last_applied_state){return;} // early out if we are already in the same state.

            last_applied_state = in_state;

            switch (in_state)
            {
                case LedState::Warmup:
                case LedState::Ready:
                    led_ctrl.ApplyMask(LedMask::M_Green);
                    break;
                case LedState::Processing:
                    // Simple quick "ACK" indication (non-blocking).
                    led_ctrl.ApplyMask(LedMask::M_Green | LedMask::M_Yellow | LedMask::M_Orange | LedMask::M_Red);
                    break;

                case LedState::Cooldown:
                    led_ctrl.ApplyMask(LedMask::M_Blue);
                    break;

                case LedState::Idle:
                default:
                    led_ctrl.Clear();
                    break;
            }
        }

        LedController& led_ctrl;
        std::mutex mutex_;
        std::condition_variable conditional_V; // Eg: https://www.youtube.com/watch?v=XZDx41woDoI
        std::thread led_thread;
        
        /*Led Thread Shared Variables*/
        LedState current_state = LedState::Idle;
        bool state_dirty = false;
        LedCommand current_command{};
        bool pending_command = false; 
        bool cancel_command = false;
        bool bStop = false;

    };


}


