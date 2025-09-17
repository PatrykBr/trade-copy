//+------------------------------------------------------------------+
//|                                         TradeCopy_Executor.mq5  |
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
input int MaxSlippage = 3;                         // Maximum slippage in points
input double RiskMultiplier = 1.0;                // Risk multiplier for position sizing
input bool EnableLogging = true;                   // Enable detailed logging
input ulong MagicNumber = 12345;                  // Magic number for copied trades

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

#include <Trade\Trade.mqh>
CTrade trade;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("TradeCopy Executor EA (MT5) started for account: ", AccountNumber);
   
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
   
   // Initialize trade object
   trade.SetExpertMagicNumber(MagicNumber);
   trade.SetDeviationInPoints(MaxSlippage);
   trade.SetTypeFilling(ORDER_FILLING_IOC);
   
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
   
   // Validate symbol
   if(!SymbolSelect(symbol, true))
   {
      Print("Error: Symbol ", symbol, " not available");
      SendExecutionResult(mapping_id, master_trade_id, 0, "failed", "Symbol not available");
      return;
   }
   
   // Validate lot size
   double min_lot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
   double max_lot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
   double lot_step = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
   
   if(lot_size < min_lot) lot_size = min_lot;
   if(lot_size > max_lot) lot_size = max_lot;
   
   // Round to lot step
   lot_size = NormalizeDouble(MathRound(lot_size / lot_step) * lot_step, 2);
   
   // Execute trade
   bool success = false;
   ulong position_ticket = 0;
   string error_description = "";
   
   string comment = StringFormat("Copy:%s", master_trade_id);
   
   if(trade_type == "buy")
   {
      success = trade.Buy(lot_size, symbol, 0, stop_loss, take_profit, comment);
   }
   else if(trade_type == "sell")
   {
      success = trade.Sell(lot_size, symbol, 0, stop_loss, take_profit, comment);
   }
   
   if(success)
   {
      MqlTradeResult result;
      trade.Result(result);
      position_ticket = result.order; // In MT5, this is the position ticket
      
      Print("Copy trade executed successfully: ", symbol, " ", trade_type, " ", lot_size, " lots, position: ", position_ticket);
      SendExecutionResult(mapping_id, master_trade_id, position_ticket, "success", "");
   }
   else
   {
      MqlTradeResult result;
      trade.Result(result);
      error_description = StringFormat("Error %d: %s", result.retcode, GetRetcodeDescription(result.retcode));
      
      Print("Failed to execute copy trade: ", symbol, " ", trade_type, " ", error_description);
      SendExecutionResult(mapping_id, master_trade_id, 0, "failed", error_description);
   }
}

//+------------------------------------------------------------------+
//| Send execution result                                           |
//+------------------------------------------------------------------+
void SendExecutionResult(string mapping_id, string master_trade_id, ulong position_ticket, string status, string error_msg)
{
   string result_msg = StringFormat(
      "{"
      "\"type\":\"copy_executed\","
      "\"accountNumber\":\"%s\","
      "\"masterTradeId\":\"%s\","
      "\"mappingId\":\"%s\","
      "\"slaveTicket\":%llu,"
      "\"status\":\"%s\","
      "\"error\":\"%s\","
      "\"timestamp\":\"%s\""
      "}",
      AccountNumber,
      master_trade_id,
      mapping_id,
      position_ticket,
      status,
      error_msg,
      TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS)
   );
   
   SendMessage(result_msg);
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
//| Get return code description                                     |
//+------------------------------------------------------------------+
string GetRetcodeDescription(uint retcode)
{
   switch(retcode)
   {
      case TRADE_RETCODE_REQUOTE:           return "Requote";
      case TRADE_RETCODE_REJECT:            return "Request rejected";
      case TRADE_RETCODE_CANCEL:            return "Request canceled by trader";
      case TRADE_RETCODE_PLACED:            return "Order placed";
      case TRADE_RETCODE_DONE:              return "Request completed";
      case TRADE_RETCODE_DONE_PARTIAL:      return "Only part of the request was completed";
      case TRADE_RETCODE_ERROR:             return "Request processing error";
      case TRADE_RETCODE_TIMEOUT:           return "Request canceled by timeout";
      case TRADE_RETCODE_INVALID:           return "Invalid request";
      case TRADE_RETCODE_INVALID_VOLUME:    return "Invalid volume in the request";
      case TRADE_RETCODE_INVALID_PRICE:     return "Invalid price in the request";
      case TRADE_RETCODE_INVALID_STOPS:     return "Invalid stops in the request";
      case TRADE_RETCODE_TRADE_DISABLED:    return "Trade is disabled";
      case TRADE_RETCODE_MARKET_CLOSED:     return "Market is closed";
      case TRADE_RETCODE_NO_MONEY:          return "There is not enough money to complete the request";
      case TRADE_RETCODE_PRICE_CHANGED:     return "Prices changed";
      case TRADE_RETCODE_PRICE_OFF:         return "There are no quotes to process the request";
      case TRADE_RETCODE_INVALID_EXPIRATION: return "Invalid order expiration date in the request";
      case TRADE_RETCODE_ORDER_CHANGED:     return "Order state changed";
      case TRADE_RETCODE_TOO_MANY_REQUESTS: return "Too frequent requests";
      case TRADE_RETCODE_NO_CHANGES:        return "No changes in request";
      case TRADE_RETCODE_SERVER_DISABLES_AT: return "Autotrading disabled by server";
      case TRADE_RETCODE_CLIENT_DISABLES_AT: return "Autotrading disabled by client terminal";
      case TRADE_RETCODE_LOCKED:            return "Request locked for processing";
      case TRADE_RETCODE_FROZEN:            return "Order or position frozen";
      case TRADE_RETCODE_INVALID_FILL:      return "Invalid order filling type";
      case TRADE_RETCODE_CONNECTION:        return "No connection with the trade server";
      case TRADE_RETCODE_ONLY_REAL:         return "Operation is allowed only for live accounts";
      case TRADE_RETCODE_LIMIT_ORDERS:      return "The number of pending orders has reached the limit";
      case TRADE_RETCODE_LIMIT_VOLUME:      return "The volume of orders and positions for the symbol has reached the limit";
      default:                              return StringFormat("Unknown error %d", retcode);
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