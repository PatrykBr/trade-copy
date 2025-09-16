//+------------------------------------------------------------------+
//|                                         TradeCopy_Executor.mq4  |
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
input int MaxSlippage = 3;                         // Maximum slippage in points
input double RiskMultiplier = 1.0;                // Risk multiplier for position sizing
input bool EnableLogging = true;                   // Enable detailed logging
input int MagicNumber = 12345;                     // Magic number for copied trades

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
bool is_authenticated = false;
string pending_orders[];
int pending_count = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("TradeCopy Executor EA started for account: ", AccountNumber);
   
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
   
   Print("TradeCopy Executor EA stopped. Reason: ", reason);
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
   
   // Process pending orders
   ProcessPendingOrders();
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
         Print("Authentication successful! Ready to receive copy instructions.");
      }
      else if(StringFind(message, "\"type\":\"auth_required\"") >= 0)
      {
         SendAuthenticationMessage();
      }
      else if(StringFind(message, "\"type\":\"copy_instruction\"") >= 0)
      {
         ProcessCopyInstruction(message);
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
//| Process copy instruction                                        |
//+------------------------------------------------------------------+
void ProcessCopyInstruction(string message)
{
   if(!is_authenticated) return;
   
   // Parse copy instruction (simplified JSON parsing)
   string symbol = ExtractValue(message, "symbol");
   string trade_type = ExtractValue(message, "tradeType");
   string lot_size_str = ExtractValue(message, "lotSize");
   string stop_loss_str = ExtractValue(message, "stopLoss");
   string take_profit_str = ExtractValue(message, "takeProfit");
   string mapping_id = ExtractValue(message, "mappingId");
   string master_trade_id = ExtractValue(message, "masterTradeId");
   
   if(StringLen(symbol) == 0 || StringLen(trade_type) == 0 || StringLen(lot_size_str) == 0)
   {
      Print("Error: Invalid copy instruction received");
      return;
   }
   
   double lot_size = StringToDouble(lot_size_str) * RiskMultiplier;
   double stop_loss = StringLen(stop_loss_str) > 0 ? StringToDouble(stop_loss_str) : 0;
   double take_profit = StringLen(take_profit_str) > 0 ? StringToDouble(take_profit_str) : 0;
   
   // Validate lot size
   double min_lot = MarketInfo(symbol, MODE_MINLOT);
   double max_lot = MarketInfo(symbol, MODE_MAXLOT);
   double lot_step = MarketInfo(symbol, MODE_LOTSTEP);
   
   if(lot_size < min_lot) lot_size = min_lot;
   if(lot_size > max_lot) lot_size = max_lot;
   
   // Round to lot step
   lot_size = NormalizeDouble(lot_size / lot_step, 0) * lot_step;
   
   // Execute trade
   int order_type = (trade_type == "buy") ? OP_BUY : OP_SELL;
   double price = (order_type == OP_BUY) ? MarketInfo(symbol, MODE_ASK) : MarketInfo(symbol, MODE_BID);
   
   string comment = StringFormat("Copy:%s", master_trade_id);
   
   int ticket = OrderSend(
      symbol,
      order_type,
      lot_size,
      price,
      MaxSlippage,
      stop_loss,
      take_profit,
      comment,
      MagicNumber,
      0,
      (order_type == OP_BUY) ? clrGreen : clrRed
   );
   
   if(ticket > 0)
   {
      Print("Copy trade executed successfully: ", symbol, " ", trade_type, " ", lot_size, " lots, ticket: ", ticket);
      
      // Send acknowledgment
      string ack_msg = StringFormat(
         "{"
         "\"type\":\"copy_executed\","
         "\"accountNumber\":\"%s\","
         "\"masterTradeId\":\"%s\","
         "\"mappingId\":\"%s\","
         "\"slaveTicket\":%d,"
         "\"status\":\"success\","
         "\"timestamp\":\"%s\""
         "}",
         AccountNumber,
         master_trade_id,
         mapping_id,
         ticket,
         TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS)
      );
      
      SendMessage(ack_msg);
   }
   else
   {
      int error = GetLastError();
      Print("Failed to execute copy trade: ", symbol, " ", trade_type, " Error: ", error, " - ", ErrorDescription(error));
      
      // Send error acknowledgment
      string error_msg = StringFormat(
         "{"
         "\"type\":\"copy_executed\","
         "\"accountNumber\":\"%s\","
         "\"masterTradeId\":\"%s\","
         "\"mappingId\":\"%s\","
         "\"status\":\"failed\","
         "\"error\":\"%s\","
         "\"timestamp\":\"%s\""
         "}",
         AccountNumber,
         master_trade_id,
         mapping_id,
         ErrorDescription(error),
         TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS)
      );
      
      SendMessage(error_msg);
   }
}

//+------------------------------------------------------------------+
//| Process pending orders queue                                   |
//+------------------------------------------------------------------+
void ProcessPendingOrders()
{
   // This function would process any orders that failed due to market conditions
   // and retry them when conditions improve
   
   for(int i = pending_count - 1; i >= 0; i--)
   {
      // Process pending order
      // Remove from queue if successful or expired
   }
}

//+------------------------------------------------------------------+
//| Extract value from JSON string (simplified)                    |
//+------------------------------------------------------------------+
string ExtractValue(string json, string key)
{
   string search_pattern = StringFormat("\"%s\":\"", key);
   int start_pos = StringFind(json, search_pattern);
   
   if(start_pos < 0)
   {
      // Try numeric value (no quotes)
      search_pattern = StringFormat("\"%s\":", key);
      start_pos = StringFind(json, search_pattern);
      if(start_pos < 0) return "";
      
      start_pos += StringLen(search_pattern);
      int end_pos = StringFind(json, ",", start_pos);
      if(end_pos < 0) end_pos = StringFind(json, "}", start_pos);
      if(end_pos < 0) return "";
      
      return StringSubstr(json, start_pos, end_pos - start_pos);
   }
   
   start_pos += StringLen(search_pattern);
   int end_pos = StringFind(json, "\"", start_pos);
   if(end_pos < 0) return "";
   
   return StringSubstr(json, start_pos, end_pos - start_pos);
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

//+------------------------------------------------------------------+
//| Error description helper                                        |
//+------------------------------------------------------------------+
string ErrorDescription(int error_code)
{
   switch(error_code)
   {
      case 0:    return "No error";
      case 1:    return "No error but result is unknown";
      case 2:    return "Common error";
      case 3:    return "Invalid trade parameters";
      case 4:    return "Trade server is busy";
      case 5:    return "Old version of the client terminal";
      case 6:    return "No connection with trade server";
      case 7:    return "Not enough rights";
      case 8:    return "Too frequent requests";
      case 9:    return "Malfunctional trade operation";
      case 64:   return "Account disabled";
      case 65:   return "Invalid account";
      case 128:  return "Trade timeout";
      case 129:  return "Invalid price";
      case 130:  return "Invalid stops";
      case 131:  return "Invalid trade volume";
      case 132:  return "Market is closed";
      case 133:  return "Trade is disabled";
      case 134:  return "Not enough money";
      case 135:  return "Price changed";
      case 136:  return "Off quotes";
      case 137:  return "Broker is busy";
      case 138:  return "Requote";
      case 139:  return "Order is locked";
      case 140:  return "Long positions only allowed";
      case 141:  return "Too many requests";
      case 145:  return "Modification denied because order too close to market";
      case 146:  return "Trade context is busy";
      case 147:  return "Expirations are denied by broker";
      case 148:  return "Amount of open and pending orders has reached the limit";
      default:   return StringFormat("Unknown error %d", error_code);
   }
}