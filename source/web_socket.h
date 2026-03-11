#pragma once
#include "analyzer.h"
#include <chrono>
#include <fmt/core.h>
#include <ixwebsocket/IXNetSystem.h>
#include <ixwebsocket/IXWebSocket.h>
#include <ixwebsocket/IXUserAgent.h>
#include <atomic>
#include <string>

namespace DrunkAPI 
{
    struct Drunk_Snapshot
    {
        BreathAnalyzerState state{BreathAnalyzerState::Warmup};
        double voltage{0.f};
        uint64_t t_us{0};
    };

    class DrunkWebSocket
    {
        public:
            explicit DrunkWebSocket(std::string url, 
                std::chrono::milliseconds snapshotperiod = std::chrono::milliseconds(50))
                : socket_url(std::move(url)), period(snapshotperiod){}

        void start()
        {
            ws.setUrl(socket_url);
            ws.setOnMessageCallback([this](const ix::WebSocketMessagePtr& msg)
            {
                if (msg->type == ix::WebSocketMessageType::Open) 
                {
                    open.store(true,  std::memory_order_relaxed);
                    SendDeviceIdentity(); // Seed the Device ID uniquely to distinguish from web client sockets.
                }
                if (msg->type == ix::WebSocketMessageType::Close){open.store(false, std::memory_order_relaxed);}
                if (msg->type == ix::WebSocketMessageType::Error){open.store(false, std::memory_order_relaxed);}
            });
            ws.start();
        }

        void stop() { ws.stop(); open.store(false, std::memory_order_relaxed); }

        void SendSnapshot(BreathAnalyzerState state,uint64_t t_us, double volts, double ppm, double bac)
        {
            if (!open.load(std::memory_order_relaxed)){return;}
            
            auto json = fmt::format("{{\"state\":{},\"t_us\":{},\"voltage\":{:.6f},\"ppm\":{:.6f},\"bac\":{:.6f}}}", static_cast<int>(state), t_us, volts, ppm, bac);
            
            if(state == BreathAnalyzerState::Analyzed)
            {
                // Send Immediately
                ws.send(json);
                return;
            }

            const auto now = std::chrono::steady_clock::now();
            if (now - last_snapshot_send >= period)
            {
                last_snapshot_send = now;
                ws.send(json);
            }
        }
        
        // Hardcoded Device ClientId to zero since we really only have one hardware device pushing data through the socket anyway. 
        void SendDeviceIdentity()
        {
            ws.send(fmt::format("{{\"type\":\"device\",\"clientId\":{}}}", 0));
        }

        private:
            std::string socket_url;
            std::chrono::milliseconds period;
            ix::WebSocket ws;
            std::atomic<bool> open{false};
            std::chrono::steady_clock::time_point last_snapshot_send{}; // Store the last send message.
            
    };
}