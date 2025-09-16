//+------------------------------------------------------------------+
//| TradeCopy_HTTP_Executor.mq4                                     |
//| HTTP-based Trade Executor for TradeCopy Pro (Vercel Compatible)|
//| Polls for copy instructions via HTTP and executes trades       |
//+------------------------------------------------------------------+
#property strict

// Input parameters
input string ServerURL = "https://trade-copy-dolomzrv2-patrykbrs-projects.vercel.app/api/trade-bridge";
input string AccountNumber = "789012";
input string ApiKey = "your-api-key";
input int PollInterval = 2;  // Seconds between instruction checks
input double MaxLotSize = 10.0;
input double MinLotSize = 0.01;

// Global variables
datetime lastPoll = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
    Print("🚀 TradeCopy HTTP Executor Started");
    Print("📡 Server: ", ServerURL);
    Print("🔢 Account: ", AccountNumber);
    Print("📊 Lot Range: ", MinLotSize, " - ", MaxLotSize);
    
    // Send initial heartbeat
    SendHeartbeat();
    
    return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    Print("❌ TradeCopy HTTP Executor Stopped");
}

//+------------------------------------------------------------------+
//| Expert tick function                                            |
//+------------------------------------------------------------------+
void OnTick()
{
    // Poll for instructions every PollInterval seconds
    if (TimeCurrent() - lastPoll >= PollInterval)
    {
        CheckForInstructions();
        lastPoll = TimeCurrent();
    }
    
    // Send heartbeat every 30 seconds
    static datetime lastHeartbeat = 0;
    if (TimeCurrent() - lastHeartbeat >= 30)
    {
        SendHeartbeat();
        lastHeartbeat = TimeCurrent();
    }
}

//+------------------------------------------------------------------+
//| Check for copy instructions from server                         |
//+------------------------------------------------------------------+
void CheckForInstructions()
{
    string url = ServerURL + "?endpoint=get-instructions";
    string headers = "Content-Type: application/json\r\n";
    
    string json = StringFormat(
        "{"
        "\"accountNumber\":\"%s\""
        "}",
        AccountNumber
    );
    
    char data[], result[];
    StringToCharArray(json, data, 0, StringLen(json));
    
    string resultHeaders;
    int res = WebRequest("POST", url, headers, 5000, data, result, resultHeaders);
    
    if (res == 200)
    {
        string response = CharArrayToString(result);
        ProcessInstructions(response);
    }
    else if (res != -1)
    {
        Print("⚠️ Instructions poll failed: ", res);
    }
}

//+------------------------------------------------------------------+
//| Process received instructions                                    |
//+------------------------------------------------------------------+
void ProcessInstructions(string response)
{
    // Simple JSON parsing (in production, use a proper JSON library)
    if (StringFind(response, "\"instructions\":[]") >= 0)
    {
        return; // No instructions
    }
    
    if (StringFind(response, "open_trade") >= 0)
    {
        Print("📋 Copy instruction received");
        
        // Extract trade details (simplified parsing)
        string symbol = ExtractJsonString(response, "symbol");
        string tradeType = ExtractJsonString(response, "trade_type");
        double lotSize = ExtractJsonDouble(response, "lot_size");
        double price = ExtractJsonDouble(response, "price");
        double stopLoss = ExtractJsonDouble(response, "stop_loss");
        double takeProfit = ExtractJsonDouble(response, "take_profit");
        
        if (symbol != "" && lotSize > 0)
        {
            ExecuteTrade(symbol, tradeType, lotSize, stopLoss, takeProfit);
        }
    }
}

//+------------------------------------------------------------------+
//| Execute a copy trade                                            |
//+------------------------------------------------------------------+
void ExecuteTrade(string symbol, string tradeType, double lotSize, double stopLoss, double takeProfit)
{
    // Validate lot size
    lotSize = MathMax(MinLotSize, MathMin(MaxLotSize, lotSize));
    
    // Normalize lot size to broker requirements
    double minLot = MarketInfo(symbol, MODE_MINLOT);
    double maxLot = MarketInfo(symbol, MODE_MAXLOT);
    double lotStep = MarketInfo(symbol, MODE_LOTSTEP);
    
    lotSize = MathMax(minLot, MathMin(maxLot, lotSize));
    lotSize = NormalizeDouble(lotSize / lotStep, 0) * lotStep;
    
    // Determine order type
    int orderType = (tradeType == "buy") ? OP_BUY : OP_SELL;
    
    // Get current price
    double currentPrice = (orderType == OP_BUY) ? MarketInfo(symbol, MODE_ASK) : MarketInfo(symbol, MODE_BID);
    
    // Place order
    int ticket = OrderSend(
        symbol,
        orderType,
        lotSize,
        currentPrice,
        3, // 3 pip slippage
        stopLoss,
        takeProfit,
        "TradeCopy",
        0,
        0,
        (orderType == OP_BUY) ? clrBlue : clrRed
    );
    
    if (ticket > 0)
    {
        Print("✅ Copy trade executed: ", symbol, " ", lotSize, " lots, Ticket: ", ticket);
    }
    else
    {
        Print("❌ Copy trade failed: ", GetLastError());
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
        TimeToStr(TimeCurrent(), TIME_DATE|TIME_SECONDS),
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
//| Helper functions for JSON parsing                               |
//+------------------------------------------------------------------+
string ExtractJsonString(string json, string key)
{
    string searchFor = "\"" + key + "\":\"";
    int start = StringFind(json, searchFor);
    if (start < 0) return "";
    
    start += StringLen(searchFor);
    int end = StringFind(json, "\"", start);
    if (end < 0) return "";
    
    return StringSubstr(json, start, end - start);
}

double ExtractJsonDouble(string json, string key)
{
    string searchFor = "\"" + key + "\":";
    int start = StringFind(json, searchFor);
    if (start < 0) return 0.0;
    
    start += StringLen(searchFor);
    int end = StringFind(json, ",", start);
    if (end < 0) end = StringFind(json, "}", start);
    if (end < 0) return 0.0;
    
    string valueStr = StringSubstr(json, start, end - start);
    StringReplace(valueStr, " ", "");
    
    return StrToDouble(valueStr);
}