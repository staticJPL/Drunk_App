#pragma once
#include <cerrno>
#include <cstdio>
#include <cstring>
#include <fmt/core.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <arpa/inet.h>
#include <unistd.h>

namespace DrunkAPI 
{

    // AF_NET is the IP protocol 
    [[maybe_unused]] inline static int tcp_connect(const char* ip_address, uint16_t port)
    {
        // Protocol 0 setups the socket automatically 
        int newSocket = ::socket(AF_INET,SOCK_STREAM,0); // TCP configuration Default.
        if(newSocket < 0){std::perror("Socket Error"); return -1;}

        sockaddr_in address{}; // Can memset to zero also.

        address.sin_family = AF_INET;
        // Define our Network byte order, 16 bit big indian.
        // https://www.ibm.com/docs/en/zvm/7.3.0?topic=domains-network-byte-order-host-byte-order
        // https://www.ibm.com/docs/en/zvm/7.3.0?topic=interface-network-application-example#sktapp__stp2soc
        address.sin_port = htons(port);

        // Convert IP to binary format. Buff ref stores holds result.
        if(::inet_pton(AF_INET,ip_address,&address.sin_addr) != 1)
        {
            fmt::print(stderr, "Error converting IP '{}': System error {} - {}\n", ip_address, errno, strerror(errno));
            ::close(newSocket);  // close file descriptor.
            return -1;
        }

        if(::connect(newSocket,reinterpret_cast<const sockaddr*>(&address), sizeof(address)) < 0)
        { 
            fmt::print(stderr,"Failed to Connect to Host '{}': System Error {} - {} \n",ip_address,errno,strerror(errno));
            return -1;
        }


        return newSocket;
    }

    [[maybe_unused]] inline static bool tcp_send_batch(int socket, const void* data, size_t len) 
    {
        const char* data_buffer = reinterpret_cast<const char*>(data);
        while (len > 0) {
            ssize_t byte = ::send(socket, data_buffer, len, MSG_NOSIGNAL);
            if (byte < 0) { std::perror("Error: Failed to Send Data"); return false; }
            data_buffer += static_cast<size_t>(byte); // walk the buffer
            len -= static_cast<size_t>(byte);
        }
        return true;
    }
}