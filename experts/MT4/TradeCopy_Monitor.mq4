//+------------------------------------------------------------------+
//|                                          TradeCopy_Monitor.mq4  |
//|                               Copyright 2025, TradeCopy Pro     |
//|                                https://tradecopypro.com         |
//+------------------------------------------------------------------+
#property copyright "Copyright 2025, TradeCopy Pro"
#property link      "https://tradecopypro.com"
#property version   "1.00"
#property strict

//--- EA Parameters
input string WebSocketURL = "ws://localhost:8080";  // WebSocket Server URL
input string AccountNumber = "";                    // Your Account Number
input string APIKey = "";                          // Your API Key
input int HeartbeatInterval = 5;                   // Heartbeat interval in seconds
input bool EnableLogging = true;                   // Enable detailed logging

//--- Global Variables
#import "ws_client.dll"
   int  ws_connect(string url);
   void ws_disconnect(int handle);
   bool ws_send(int handle, string message);
   string ws_receive(int handle);
   bool ws_is_connected(int handle);
#import

int ws_handle = -1;
datetime last_heartbeat = 0;
datetime last_connection_attempt = 0;
int connection_retry_delay = 5; // seconds
string trade_history[];
int trade_count = 0;
bool is_authenticated = false;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("TradeCopy Monitor EA started for account: ", AccountNumber);
   
   // Validate required parameters
   if(StringLen(AccountNumber) == 0)
   {
      Alert("Error: Account Number is required!");
      return(INIT_PARAMETERS_INCORRECT);
   }
   
   if(StringLen(APIKey) == 0)
   {
      Alert("Error: API Key is required!");
      return(INIT_PARAMETERS_INCORRECT);
   }
   
   // Initialize connection
   ConnectToServer();
   
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                               |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   if(ws_handle >= 0)
   {
      SendMessage("{'type':'disconnect','reason':'ea_shutdown'}");
      ws_disconnect(ws_handle);
      ws_handle = -1;
   }
   
   Print("TradeCopy Monitor EA stopped. Reason: ", reason);
}

//+------------------------------------------------------------------+
//| Expert tick function                                            |
//+------------------------------------------------------------------+
void OnTick()
{
   // Handle WebSocket connection
   HandleWebSocketConnection();
   
   // Send heartbeat if needed
   SendHeartbeatIfNeeded();
   
   // Process incoming messages
   ProcessIncomingMessages();
}

//+------------------------------------------------------------------+
//| Trade event handler                                             |
//+------------------------------------------------------------------+
void OnTrade()
{
   if(!is_authenticated) return;
   
   // Get the latest trade
   int total = OrdersHistoryTotal();
   
   for(int i = total - 1; i >= 0; i--)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_HISTORY))
      {
         string trade_id = IntegerToString(OrderTicket());
         
         // Check if we've already processed this trade
         if(!IsTradeProcessed(trade_id))
         {
            SendTradeSignal(OrderTicket(), "trade_closed");
            AddProcessedTrade(trade_id);
         }
      }
   }
   
   // Check for new open trades
   total = OrdersTotal();
   for(int i = total - 1; i >= 0; i--)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
      {
         string trade_id = IntegerToString(OrderTicket());
         
         if(!IsTradeProcessed(trade_id))
         {
            SendTradeSignal(OrderTicket(), "trade_opened");
            AddProcessedTrade(trade_id);
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Connect to WebSocket server                                     |
//+------------------------------------------------------------------+
void ConnectToServer()
{
   if(TimeCurrent() - last_connection_attempt < connection_retry_delay)
      return;
   
   last_connection_attempt = TimeCurrent();
   
   if(ws_handle >= 0)
   {
      ws_disconnect(ws_handle);
   }
   
   Print("Connecting to WebSocket server: ", WebSocketURL);
   ws_handle = ws_connect(WebSocketURL);
   
   if(ws_handle >= 0)
   {
      Print("WebSocket connection established");
      is_authenticated = false;
      SendAuthenticationMessage();
   }
   else
   {
      Print("Failed to connect to WebSocket server. Retrying in ", connection_retry_delay, " seconds...");
      connection_retry_delay = MathMin(connection_retry_delay * 2, 60); // Exponential backoff, max 60s
   }
}

//+------------------------------------------------------------------+
//| Handle WebSocket connection status                              |
//+------------------------------------------------------------------+
void HandleWebSocketConnection()
{
   if(ws_handle >= 0 && !ws_is_connected(ws_handle))
   {
      Print("WebSocket connection lost. Attempting to reconnect...");
      ws_handle = -1;
      is_authenticated = false;
      ConnectToServer();
   }
   else if(ws_handle < 0)
   {
      ConnectToServer();
   }
}

//+------------------------------------------------------------------+
//| Send authentication message                                     |
//+------------------------------------------------------------------+
void SendAuthenticationMessage()
{
   if(ws_handle < 0) return;
   
   string auth_msg = StringFormat(
      "{"
      "\"type\":\"auth\","
      "\"accountNumber\":\"%s\","
      "\"apiKey\":\"%s\","
      "\"platform\":\"MT4\","
      "\"timestamp\":\"%s\""
      "}",
      AccountNumber,
      APIKey,
      TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS)
   );
   
   if(ws_send(ws_handle, auth_msg))
   {
      if(EnableLogging) Print("Authentication message sent");
   }
   else
   {
      Print("Failed to send authentication message");
   }
}

//+------------------------------------------------------------------+
//| Send heartbeat if needed                                        |
//+------------------------------------------------------------------+
void SendHeartbeatIfNeeded()
{
   if(ws_handle < 0 || !is_authenticated) return;
   
   if(TimeCurrent() - last_heartbeat >= HeartbeatInterval)
   {
      string heartbeat_msg = StringFormat(
         "{"
         "\"type\":\"heartbeat\","
         "\"accountNumber\":\"%s\","
         "\"timestamp\":\"%s\","
         "\"latency\":%d"
         "}",
         AccountNumber,
         TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS),
         GetTickCount()
      );
      
      if(ws_send(ws_handle, heartbeat_msg))
      {
         last_heartbeat = TimeCurrent();
         if(EnableLogging) Print("Heartbeat sent");
      }
   }
}

//+------------------------------------------------------------------+
//| Send trade signal                                               |
//+------------------------------------------------------------------+
void SendTradeSignal(int ticket, string signal_type)
{
   if(ws_handle < 0 || !is_authenticated) return;
   
   if(!OrderSelect(ticket, SELECT_BY_TICKET))
   {
      Print("Error: Cannot select order ", ticket);
      return;
   }
   
   string trade_msg = StringFormat(
      "{"
      "\"type\":\"%s\","
      "\"accountNumber\":\"%s\","
      "\"trade\":{"
         "\"platformTradeId\":\"%d\","
         "\"symbol\":\"%s\","
         "\"tradeType\":\"%s\","
         "\"lotSize\":%.2f,"
         "\"openPrice\":%.5f,"
         "\"closePrice\":%.5f,"
         "\"stopLoss\":%.5f,"
         "\"takeProfit\":%.5f,"
         "\"comment\":\"%s\","
         "\"magicNumber\":%d,"
         "\"openTime\":\"%s\","
         "\"closeTime\":\"%s\""
      "},"
      "\"timestamp\":\"%s\","
      "\"latency\":%d"
      "}",
      signal_type,
      AccountNumber,
      OrderTicket(),
      OrderSymbol(),
      OrderType() == OP_BUY ? "buy" : "sell",
      OrderLots(),
      OrderOpenPrice(),
      OrderClosePrice(),
      OrderStopLoss(),
      OrderTakeProfit(),
      OrderComment(),
      OrderMagicNumber(),
      TimeToString(OrderOpenTime(), TIME_DATE|TIME_SECONDS),
      OrderCloseTime() > 0 ? TimeToString(OrderCloseTime(), TIME_DATE|TIME_SECONDS) : "",
      TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS),
      GetTickCount()
   );
   
   if(ws_send(ws_handle, trade_msg))
   {
      if(EnableLogging) 
         Print("Trade signal sent: ", signal_type, " for ", OrderSymbol(), " ticket ", OrderTicket());
   }
   else
   {
      Print("Failed to send trade signal for ticket ", OrderTicket());
   }
}

//+------------------------------------------------------------------+
//| Process incoming WebSocket messages                             |
//+------------------------------------------------------------------+
void ProcessIncomingMessages()
{
   if(ws_handle < 0) return;
   
   string message = ws_receive(ws_handle);
   if(StringLen(message) > 0)
   {
      if(EnableLogging) Print("Received message: ", message);
      
      // Parse JSON message (simplified parsing)
      if(StringFind(message, "\"type\":\"auth_success\"") >= 0)
      {
         is_authenticated = true;
         connection_retry_delay = 5; // Reset retry delay on successful auth
         Print("Authentication successful!");
         
         // Send all current open trades
         SendCurrentTrades();
      }
      else if(StringFind(message, "\"type\":\"auth_required\"") >= 0)
      {
         SendAuthenticationMessage();
      }
      else if(StringFind(message, "\"type\":\"error\"") >= 0)
      {
         Print("Server error: ", message);
      }
      else if(StringFind(message, "\"type\":\"heartbeat_ack\"") >= 0)
      {
         if(EnableLogging) Print("Heartbeat acknowledged");
      }
   }
}

//+------------------------------------------------------------------+
//| Send all current open trades                                    |
//+------------------------------------------------------------------+
void SendCurrentTrades()
{
   int total = OrdersTotal();
   Print("Sending ", total, " current open trades...");
   
   for(int i = 0; i < total; i++)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
      {
         SendTradeSignal(OrderTicket(), "trade_opened");
         string trade_id = IntegerToString(OrderTicket());
         AddProcessedTrade(trade_id);
      }
   }
}

//+------------------------------------------------------------------+
//| Check if trade has been processed                               |
//+------------------------------------------------------------------+
bool IsTradeProcessed(string trade_id)
{
   for(int i = 0; i < trade_count; i++)
   {
      if(trade_history[i] == trade_id)
         return true;
   }
   return false;
}

//+------------------------------------------------------------------+
//| Add trade to processed list                                     |
//+------------------------------------------------------------------+
void AddProcessedTrade(string trade_id)
{
   // Resize array if needed
   if(trade_count >= ArraySize(trade_history))
   {
      ArrayResize(trade_history, trade_count + 100);
   }
   
   trade_history[trade_count] = trade_id;
   trade_count++;
   
   // Clean up old trades (keep last 1000)
   if(trade_count > 1000)
   {
      for(int i = 0; i < 500; i++)
      {
         trade_history[i] = trade_history[i + 500];
      }
      trade_count = 500;
   }
}

//+------------------------------------------------------------------+
//| Send message helper                                             |
//+------------------------------------------------------------------+
void SendMessage(string message)
{
   if(ws_handle >= 0)
   {
      ws_send(ws_handle, message);
   }
}