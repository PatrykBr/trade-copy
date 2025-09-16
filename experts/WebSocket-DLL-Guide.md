# WebSocket DLL Implementation Guide

## Overview

The Expert Advisors require a WebSocket DLL to communicate with the backend service. This DLL provides a simple interface for MT4/MT5 to establish WebSocket connections.

## DLL Functions Required

```cpp
// ws_client.dll exports
extern "C" {
    __declspec(dllexport) int ws_connect(const wchar_t* url);
    __declspec(dllexport) void ws_disconnect(int handle);
    __declspec(dllexport) bool ws_send(int handle, const wchar_t* message);
    __declspec(dllexport) const wchar_t* ws_receive(int handle);
    __declspec(dllexport) bool ws_is_connected(int handle);
}
```

## Alternative: HTTP-Based Communication

For easier implementation without a custom DLL, you can modify the EAs to use HTTP requests instead of WebSocket:

### 1. Replace WebSocket with HTTP Polling

```mql4
// Instead of WebSocket, use HTTP requests
input string ServerURL = "http://localhost:3000/api/trades";  // API endpoint
input int PollInterval = 1;  // Poll every 1 second

// Use wininet.dll for HTTP requests
#import "wininet.dll"
   int InternetOpenW(string sAgent, int lAccessType, string sProxyName, string sProxyBypass, int lFlags);
   int InternetOpenUrlW(int hInternet, string sUrl, string sHeaders, int lHeadersLength, int lFlags, int lContext);
   int InternetReadFile(int hFile, uchar &sBuffer[], int lNumBytesToRead, int &lNumberOfBytesRead[]);
   int InternetCloseHandle(int hInternet);
#import
```

### 2. Simplified EA Communication

```mql4
void SendTradeSignal(string signal_type, int ticket) {
    string url = StringFormat("%s/signal", ServerURL);
    string json_data = CreateTradeJSON(signal_type, ticket);
    
    // Send HTTP POST request
    SendHTTPRequest(url, json_data);
}

void CheckForCopyInstructions() {
    string url = StringFormat("%s/instructions/%s", ServerURL, AccountNumber);
    string response = SendHTTPRequest(url, "");
    
    if(StringLen(response) > 0) {
        ProcessCopyInstructions(response);
    }
}
```

## Production Implementation

For production, you have several options:

### Option 1: Custom WebSocket DLL
- Build a lightweight WebSocket client DLL using C++
- Libraries: libwebsockets, Beast (Boost), or simple Win32 sockets
- Most efficient for real-time communication

### Option 2: HTTP with Server-Sent Events
- EAs send trade signals via HTTP POST
- EAs poll for copy instructions via HTTP GET
- Server pushes updates via Server-Sent Events (if needed)

### Option 3: Named Pipes (Windows Only)
- Use Windows Named Pipes for local communication
- EAs communicate with a local service
- Local service handles WebSocket to your backend

## Recommended Approach for MVP

Start with HTTP-based communication:

1. **Trade Signals**: HTTP POST to `/api/trades/signal`
2. **Copy Instructions**: HTTP GET from `/api/trades/instructions/{accountNumber}`
3. **Heartbeat**: HTTP POST to `/api/trades/heartbeat`

This avoids the complexity of DLL development while maintaining functionality.

## File Structure

```
experts/
├── MT4/
│   ├── TradeCopy_Monitor.mq4
│   ├── TradeCopy_Executor.mq4
│   └── Include/
│       └── TradeCopy_HTTP.mqh      # HTTP utility functions
├── MT5/
│   ├── TradeCopy_Monitor.mq5
│   ├── TradeCopy_Executor.mq5
│   └── Include/
│       └── TradeCopy_HTTP.mqh      # HTTP utility functions
└── DLL/
    ├── ws_client.dll               # Optional WebSocket DLL
    └── source/                     # DLL source code
        ├── ws_client.cpp
        ├── ws_client.h
        └── CMakeLists.txt
```

## Next Steps

1. **For testing**: Modify EAs to use HTTP communication
2. **For production**: Build WebSocket DLL or use HTTP polling
3. **Security**: Implement API key authentication
4. **Error handling**: Add retry logic and connection recovery
5. **Performance**: Optimize message frequency and payload size