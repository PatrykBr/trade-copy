//+------------------------------------------------------------------+
//|                                          TradeCopy_Monitor.mq5  |
//|                               Copyright 2025, TradeCopy Pro     |
//|                                https://tradecopypro.com         |
//+------------------------------------------------------------------+
#property copyright "Copyright 2025, TradeCopy Pro"
#property link      "https://tradecopypro.com"
#property version   "1.00"

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
ulong last_deal_ticket = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("TradeCopy Monitor EA (MT5) started for account: ", AccountNumber);
   
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
   
   // Check for new deals
   CheckForNewDeals();
}

//+------------------------------------------------------------------+
//| Trade transaction event                                         |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                       const MqlTradeRequest& request,
                       const MqlTradeResult& result)
{
   if(!is_authenticated) return;
   
   // Handle different transaction types
   switch(trans.type)
   {
      case TRADE_TRANSACTION_DEAL_ADD:
         HandleDealAdd(trans);
         break;
         
      case TRADE_TRANSACTION_ORDER_ADD:
         HandleOrderAdd(trans);
         break;
         
      case TRADE_TRANSACTION_ORDER_DELETE:
         HandleOrderDelete(trans);
         break;
         
      case TRADE_TRANSACTION_ORDER_UPDATE:
         HandleOrderUpdate(trans);
         break;
         
      case TRADE_TRANSACTION_POSITION:
         HandlePosition(trans);
         break;
   }
}

//+------------------------------------------------------------------+
//| Handle deal add event                                           |
//+------------------------------------------------------------------+
void HandleDealAdd(const MqlTradeTransaction& trans)
{
   ulong deal_ticket = trans.deal;
   if(deal_ticket == 0) return;
   
   // Select the deal
   if(!HistoryDealSelect(deal_ticket))
      return;
   
   ENUM_DEAL_TYPE deal_type = (ENUM_DEAL_TYPE)HistoryDealGetInteger(deal_ticket, DEAL_TYPE);
   
   // Only process buy/sell deals
   if(deal_type != DEAL_TYPE_BUY && deal_type != DEAL_TYPE_SELL)
      return;
   
   string symbol = HistoryDealGetString(deal_ticket, DEAL_SYMBOL);
   double volume = HistoryDealGetDouble(deal_ticket, DEAL_VOLUME);
   double price = HistoryDealGetDouble(deal_ticket, DEAL_PRICE);
   ulong position_id = HistoryDealGetInteger(deal_ticket, DEAL_POSITION_ID);
   datetime deal_time = (datetime)HistoryDealGetInteger(deal_ticket, DEAL_TIME);
   string comment = HistoryDealGetString(deal_ticket, DEAL_COMMENT);
   
   // Check if this is opening or closing a position
   if(PositionSelectByTicket(position_id))
   {
      // Position still exists - this was opening or adding to position
      SendPositionSignal(position_id, "trade_opened");
   }
   else
   {
      // Position closed - send close signal
      SendDealSignal(deal_ticket, "trade_closed");
   }
}

//+------------------------------------------------------------------+
//| Handle order add event                                          |
//+------------------------------------------------------------------+
void HandleOrderAdd(const MqlTradeTransaction& trans)
{
   // Handle pending orders if needed
}

//+------------------------------------------------------------------+
//| Handle order delete event                                       |
//+------------------------------------------------------------------+
void HandleOrderDelete(const MqlTradeTransaction& trans)
{
   // Handle order cancellations if needed
}

//+------------------------------------------------------------------+
//| Handle order update event                                       |
//+------------------------------------------------------------------+
void HandleOrderUpdate(const MqlTradeTransaction& trans)
{
   // Handle order modifications if needed
}

//+------------------------------------------------------------------+
//| Handle position event                                           |
//+------------------------------------------------------------------+
void HandlePosition(const MqlTradeTransaction& trans)
{
   ulong position_ticket = trans.position;
   if(position_ticket == 0) return;
   
   if(PositionSelectByTicket(position_ticket))
   {
      SendPositionSignal(position_ticket, "trade_modified");
   }
}

//+------------------------------------------------------------------+
//| Send position signal                                            |
//+------------------------------------------------------------------+
void SendPositionSignal(ulong position_ticket, string signal_type)
{
   if(ws_handle < 0 || !is_authenticated) return;
   
   if(!PositionSelectByTicket(position_ticket))
      return;
   
   string symbol = PositionGetString(POSITION_SYMBOL);
   ENUM_POSITION_TYPE pos_type = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
   double volume = PositionGetDouble(POSITION_VOLUME);
   double open_price = PositionGetDouble(POSITION_PRICE_OPEN);
   double sl = PositionGetDouble(POSITION_SL);
   double tp = PositionGetDouble(POSITION_TP);
   datetime open_time = (datetime)PositionGetInteger(POSITION_TIME);
   string comment = PositionGetString(POSITION_COMMENT);
   
   string trade_type = (pos_type == POSITION_TYPE_BUY) ? "buy" : "sell";
   
   string trade_msg = StringFormat(
      "{"
      "\"type\":\"%s\","
      "\"accountNumber\":\"%s\","
      "\"trade\":{"
         "\"platformTradeId\":\"%llu\","
         "\"symbol\":\"%s\","
         "\"tradeType\":\"%s\","
         "\"lotSize\":%.2f,"
         "\"openPrice\":%.5f,"
         "\"stopLoss\":%.5f,"
         "\"takeProfit\":%.5f,"
         "\"comment\":\"%s\","
         "\"openTime\":\"%s\""
      "},"
      "\"timestamp\":\"%s\","
      "\"latency\":%d"
      "}",
      signal_type,
      AccountNumber,
      position_ticket,
      symbol,
      trade_type,
      volume,
      open_price,
      sl,
      tp,
      comment,
      TimeToString(open_time, TIME_DATE|TIME_SECONDS),
      TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS),
      GetTickCount()
   );
   
   if(ws_send(ws_handle, trade_msg))
   {
      if(EnableLogging) 
         Print("Position signal sent: ", signal_type, " for ", symbol, " position ", position_ticket);
   }
   else
   {
      Print("Failed to send position signal for position ", position_ticket);
   }
}

//+------------------------------------------------------------------+
//| Send deal signal                                                |
//+------------------------------------------------------------------+
void SendDealSignal(ulong deal_ticket, string signal_type)
{
   if(ws_handle < 0 || !is_authenticated) return;
   
   if(!HistoryDealSelect(deal_ticket))
      return;
   
   string symbol = HistoryDealGetString(deal_ticket, DEAL_SYMBOL);
   ENUM_DEAL_TYPE deal_type = (ENUM_DEAL_TYPE)HistoryDealGetInteger(deal_ticket, DEAL_TYPE);
   double volume = HistoryDealGetDouble(deal_ticket, DEAL_VOLUME);
   double price = HistoryDealGetDouble(deal_ticket, DEAL_PRICE);
   double profit = HistoryDealGetDouble(deal_ticket, DEAL_PROFIT);
   datetime deal_time = (datetime)HistoryDealGetInteger(deal_ticket, DEAL_TIME);
   string comment = HistoryDealGetString(deal_ticket, DEAL_COMMENT);
   ulong position_id = HistoryDealGetInteger(deal_ticket, DEAL_POSITION_ID);
   
   string trade_type = (deal_type == DEAL_TYPE_BUY) ? "buy" : "sell";
   
   string trade_msg = StringFormat(
      "{"
      "\"type\":\"%s\","
      "\"accountNumber\":\"%s\","
      "\"trade\":{"
         "\"platformTradeId\":\"%llu\","
         "\"symbol\":\"%s\","
         "\"tradeType\":\"%s\","
         "\"lotSize\":%.2f,"
         "\"closePrice\":%.5f,"
         "\"profitLoss\":%.2f,"
         "\"comment\":\"%s\","
         "\"closeTime\":\"%s\""
      "},"
      "\"timestamp\":\"%s\","
      "\"latency\":%d"
      "}",
      signal_type,
      AccountNumber,
      position_id,
      symbol,
      trade_type,
      volume,
      price,
      profit,
      comment,
      TimeToString(deal_time, TIME_DATE|TIME_SECONDS),
      TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS),
      GetTickCount()
   );
   
   if(ws_send(ws_handle, trade_msg))
   {
      if(EnableLogging) 
         Print("Deal signal sent: ", signal_type, " for ", symbol, " deal ", deal_ticket);
   }
   else
   {
      Print("Failed to send deal signal for deal ", deal_ticket);
   }
}

//+------------------------------------------------------------------+
//| Check for new deals                                             |
//+------------------------------------------------------------------+
void CheckForNewDeals()
{
   if(!is_authenticated) return;
   
   // Get the latest deal
   if(!HistorySelect(0, TimeCurrent()))
      return;
   
   int total_deals = HistoryDealsTotal();
   if(total_deals == 0) return;
   
   ulong latest_deal = HistoryDealGetTicket(total_deals - 1);
   
   if(latest_deal > last_deal_ticket)
   {
      last_deal_ticket = latest_deal;
      // The deal will be processed by OnTradeTransaction
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
      "\"platform\":\"MT5\","
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
         
         // Send all current positions
         SendCurrentPositions();
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
//| Send all current positions                                      |
//+------------------------------------------------------------------+
void SendCurrentPositions()
{
   int total = PositionsTotal();
   Print("Sending ", total, " current open positions...");
   
   for(int i = 0; i < total; i++)
   {
      ulong position_ticket = PositionGetTicket(i);
      if(position_ticket > 0)
      {
         SendPositionSignal(position_ticket, "trade_opened");
      }
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