//+------------------------------------------------------------------+
//| TradeCopy_HTTP_Monitor.mq4                                       |
//| HTTP-based Trade Monitor for TradeCopy Pro (Vercel Compatible)  |
//| Monitors trades and sends signals via HTTP to Vercel Edge Function |
//+------------------------------------------------------------------+
#property strict

// Input parameters
input string ServerURL = "https://trade-copy-dolomzrv2-patrykbrs-projects.vercel.app/api/trade-bridge";
input string AccountNumber = "123456";
input string ApiKey = "your-api-key";
input int SendInterval = 5;  // Seconds between heartbeats

// Global variables
datetime lastCheck = 0;
int totalTrades = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
    Print("🚀 TradeCopy HTTP Monitor Started");
    Print("📡 Server: ", ServerURL);
    Print("🔢 Account: ", AccountNumber);
    
    // Send initial heartbeat
    SendHeartbeat();
    
    return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    Print("❌ TradeCopy HTTP Monitor Stopped");
}

//+------------------------------------------------------------------+
//| Expert tick function                                            |
//+------------------------------------------------------------------+
void OnTick()
{
    // Check for new trades every tick
    CheckForNewTrades();
    
    // Send heartbeat every SendInterval seconds
    static datetime lastHeartbeat = 0;
    if (TimeCurrent() - lastHeartbeat >= SendInterval)
    {
        SendHeartbeat();
        lastHeartbeat = TimeCurrent();
    }
}

//+------------------------------------------------------------------+
//| OnTrade function - called when trade operations occur           |
//+------------------------------------------------------------------+
void OnTrade()
{
    Print("📈 Trade event detected");
    CheckForNewTrades();
}

//+------------------------------------------------------------------+
//| Check for new or modified trades                                |
//+------------------------------------------------------------------+
void CheckForNewTrades()
{
    int currentTrades = OrdersTotal() + OrdersHistoryTotal();
    
    // If trade count changed, scan all trades
    if (currentTrades != totalTrades)
    {
        totalTrades = currentTrades;
        ScanAllTrades();
    }
}

//+------------------------------------------------------------------+
//| Scan all trades and send updates                                |
//+------------------------------------------------------------------+
void ScanAllTrades()
{
    // Scan open positions
    for (int i = 0; i < OrdersTotal(); i++)
    {
        if (OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
        {
            SendTradeSignal(true); // true = open trade
        }
    }
    
    // Scan recent history (last 10 trades)
    int historyTotal = OrdersHistoryTotal();
    int startPos = MathMax(0, historyTotal - 10);
    
    for (int i = startPos; i < historyTotal; i++)
    {
        if (OrderSelect(i, SELECT_BY_POS, MODE_HISTORY))
        {
            // Only send if closed recently (within last minute)
            if (TimeCurrent() - OrderCloseTime() <= 60)
            {
                SendTradeSignal(false); // false = closed trade
            }
        }
    }
}

//+------------------------------------------------------------------+
//| Send trade signal via HTTP                                      |
//+------------------------------------------------------------------+
void SendTradeSignal(bool isOpen)
{
    string url = ServerURL + "?endpoint=trade-signal";
    string headers = "Content-Type: application/json\r\n";
    
    // Create JSON payload
    string json = StringFormat(
        "{"
        "\"accountNumber\":\"%s\","
        "\"platform\":\"MT4\","
        "\"trade\":{"
            "\"ticket\":%d,"
            "\"symbol\":\"%s\","
            "\"type\":%d,"
            "\"lots\":%.2f,"
            "\"openPrice\":%.5f,"
            "\"closePrice\":%.5f,"
            "\"stopLoss\":%.5f,"
            "\"takeProfit\":%.5f,"
            "\"openTime\":\"%s\","
            "\"closeTime\":\"%s\","
            "\"profit\":%.2f,"
            "\"status\":\"%s\""
        "}"
        "}",
        AccountNumber,
        OrderTicket(),
        OrderSymbol(),
        OrderType(),
        OrderLots(),
        OrderOpenPrice(),
        OrderClosePrice(),
        OrderStopLoss(),
        OrderTakeProfit(),
        TimeToString(OrderOpenTime(), TIME_DATE|TIME_SECONDS),
        TimeToString(OrderCloseTime(), TIME_DATE|TIME_SECONDS),
        OrderProfit(),
        isOpen ? "open" : "closed"
    );
    
    // Send HTTP POST request
    char data[], result[];
    StringToCharArray(json, data, 0, StringLen(json));
    
    string resultHeaders;
    int res = WebRequest("POST", url, headers, 5000, data, result, resultHeaders);
    
    if (res == -1)
    {
        Print("❌ HTTP Error: ", GetLastError());
        Print("💡 Check: Tools -> Options -> Expert Advisors -> Allow WebRequest for URL: ", ServerURL);
    }
    else if (res == 200)
    {
        Print("✅ Trade signal sent successfully");
    }
    else
    {
        Print("⚠️ HTTP Response: ", res);
    }
}

//+------------------------------------------------------------------+
//| Send heartbeat to maintain connection                           |
//+------------------------------------------------------------------+
void SendHeartbeat()
{
    string url = ServerURL + "?endpoint=heartbeat";
    string headers = "Content-Type: application/json\r\n";
    
    string json = StringFormat(
        "{"
        "\"accountNumber\":\"%s\","
        "\"platform\":\"MT4\","
        "\"version\":\"1.0\","
        "\"timestamp\":\"%s\","
        "\"balance\":%.2f,"
        "\"equity\":%.2f"
        "}",
        AccountNumber,
        TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS),
        AccountBalance(),
        AccountEquity()
    );
    
    char data[], result[];
    StringToCharArray(json, data, 0, StringLen(json));
    
    string resultHeaders;
    int res = WebRequest("POST", url, headers, 5000, data, result, resultHeaders);
    
    if (res == 200)
    {
        Print("💓 Heartbeat sent");
    }
}

//+------------------------------------------------------------------+
//| Helper function to convert time to string                       |
//+------------------------------------------------------------------+
string TimeToString(datetime time, int format = TIME_DATE|TIME_SECONDS)
{
    if (time == 0) return "";
    return TimeToStr(time, format);
}