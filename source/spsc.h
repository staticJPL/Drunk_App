#pragma once
#include <atomic>
#include <cstddef>
#include <array>
#include <sys/types.h>

// References:
// https://joshrosso.com/c/ring-buffer/ 
// https://github.com/cale-cmd/ultra-low-latency-ring-buffer/blob/main/README.md

template <typename T, size_t N>
class SpscRing {
    static_assert((N & (N - 1)) == 0, "N must be power of two for fast masking");
    static constexpr u_int8_t AlignSize = 64;
public:
    bool push(const T& value) 
    {
        const auto head = head_.load(std::memory_order_relaxed); // Just read don't care about memory order
        const auto next = (head + 1) & (N - 1); // equivalent to % N so we wrap around jones (PP)

        if (next == tail_.load(std::memory_order_acquire)) { // Read but make sure changes are seen before doing a store release full
            return false;
        }

        ring_buffer_[head] = value;
        head_.store(next, std::memory_order_release);
        return true;
    }

    bool push_overwrite(const T& value)
    {
        auto head = head_.load(std::memory_order_relaxed);
        auto next = (head + 1) & (N -1);

        bool overwriten = false;

        // if full, advance tail and drop the oldest
        if(next == tail_.load(std::memory_order_acquire))
        {
            overwriten = true;
            auto tail = tail_.load(std::memory_order_relaxed); // allow second writer to stomp old data.
            tail_.store((tail + 1) & (N - 1),std::memory_order_release);
        }
        
        ring_buffer_[head] = value;

        head_.store(next,std::memory_order_release);
        
        return !overwriten;
    }

    bool pop(T& out) 
    {
        const auto tail = tail_.load(std::memory_order_relaxed);

        if (tail == head_.load(std::memory_order_acquire)) {
            // empty
            return false;
        }

        out = ring_buffer_[tail];
        tail_.store((tail + 1) & (N - 1), std::memory_order_release);
        return true;
    }

    size_t pop_batch(T* out, size_t max_batch)
    {
        size_t element = 0;
        while (element < max_batch) {
            if(!pop(out[element])){break;}
            ++element;
        }
        return element;
    }

    size_t size_approx() const {
        auto head = head_.load(std::memory_order_acquire);
        auto tail = tail_.load(std::memory_order_acquire);
        return (head - tail) & (N - 1);
    }

private:
    // Alignas is for peformance reasons so we hit the cache line neatly on Arm.
    
    alignas(AlignSize) std::array<T, N> ring_buffer_{};
    alignas(AlignSize) std::atomic<size_t> head_{0};
    alignas(AlignSize) std::atomic<size_t> tail_{0};
};
