from typing import Dict, List
import os
from groq import Groq
from sqlalchemy.orm import Session
from app.config import settings
from app.db import crud
from datetime import datetime, date, timedelta

# Initialize Groq client
# Ensure GROQ_API_KEY is set in .env
client = Groq(api_key=settings.GROQ_API_KEY.strip())

# In-memory store for chat sessions
# Format: {session_id: [{"role": "user", "content": "..."}, ...]}
chat_sessions: Dict[str, List[Dict]] = {}

from app.services.forecast_service import generate_forecast
import json

def get_context(db: Session):
    """Fetches comprehensive context from the database for the chatbot."""
    try:
        print("DEBUG: Fetching chatbot context...")
        # 1. Real-time Status
        latest = crud.get_latest_readings(db)
        devices = crud.get_all_devices(db)
        device_map = {d.id: d.threshold for d in devices}
        print(f"DEBUG: Found {len(latest)} latest readings and {len(devices)} devices")
        
        # 2. Daily Summary (Today & Yesterday)
        today = date.today()
        yesterday = today - timedelta(days=1)
        today_stats = crud.get_daily_usage(db, today)
        yesterday_stats = crud.get_daily_usage(db, yesterday)
        print(f"DEBUG: Usage stats fetched for today and yesterday")
        
        # 3. Recent Anomalies (Last 24 hours)
        anomaly_summary = crud.get_recent_anomalies(db, hours=24)
        print(f"DEBUG: Anomaly summary count: {len(anomaly_summary)}")
        
        # 4. Forecasts (Next 3 days)
        print("DEBUG: Generating forecast...")
        forecast_data = generate_forecast(db, days=3)
        if isinstance(forecast_data, list):
            # Summarize forecast for the LLM
            forecast_summary = sum(item['predicted_energy'] for item in forecast_data)
            print(f"DEBUG: Forecast total: {forecast_summary}")
        else:
            forecast_summary = "No forecast available."
            print(f"DEBUG: Forecast not available: {forecast_data}")

        context = f"CURRENT STATUS (as of {datetime.now()}):\n"
        for r in latest:
            power = (r.voltage or 0) * (r.current or 0)
            threshold = device_map.get(r.device, 2500.0)
            status = "ANOMALY" if power > threshold else "NORMAL"
            context += f"- {r.device}: {round(power, 1)}W ({status}, Limit: {threshold}W)\n"
            
        context += f"\nDAILY TOTALS:\n"
        context += f"- Today ({today}): {sum(d['total_energy'] for d in today_stats):.3f} kWh\n"
        context += f"- Yesterday ({yesterday}): {sum(d['total_energy'] for d in yesterday_stats):.3f} kWh\n"
        
        if anomaly_summary:
            context += f"\nRECENT ANOMALIES (Last 24h):\n"
            for dev, count in anomaly_summary.items():
                context += f"- {dev}: {count} detections\n"
        else:
            context += "\nNO ANOMALIES in the last 24 hours.\n"
            
        context += f"\nFORECAST (Next 3 days):\n"
        context += f"- Predicted Total: {forecast_summary if isinstance(forecast_summary, str) else f'{forecast_summary:.3f} kWh'}\n"
        
        context += "\nCURRENCY NOTE: All financial figures are in Ghana Cedis (GHC). Rate: 2.20 GHC/kWh.\n"
        
        return context
    except Exception as e:
        print(f"CRITICAL: Context generation failed: {e}")
        import traceback
        print(traceback.format_exc())
        return "Energy context is currently unavailable."


# Tool definition for Groq
tools = [
    {
        "type": "function",
        "function": {
            "name": "set_device_threshold",
            "description": "Updates the safety power threshold (in Watts) for a specific device.",
            "parameters": {
                "type": "object",
                "properties": {
                    "device_id": {
                        "type": "string",
                        "description": "The ID of the device (e.g., 'socket_1', 'bulb_2')"
                    },
                    "threshold": {
                        "type": "number",
                        "description": "The new threshold value in Watts"
                    }
                },
                "required": ["device_id", "threshold"]
            }
        }
    }
]

def ask_chatbot(question: str, session_id: str, db: Session):
    """Queries the Groq LLaMA-3 model with context, history, and tools."""
    
    if not settings.GROQ_API_KEY:
        return "I'm sorry, but the Groq API key is not configured."

    context = get_context(db)
    
    system_prompt = f"""You are "PowerGuard", a smart, witty, and slightly authoritative energy meter assistant.
    Your goal is to help users understand their energy consumption and save money.
    
    ENVIRONMENT CONTEXT:
    {context}
    
    Guidelines:
    1. **Personality**: Be confident, helpful, and a bit playful. Use emojis occasionally ⚡💡.
    2. **Data Usage**: Use the ENVIRONMENT CONTEXT to answer questions. If asked about status, trends, or costs, refer to this data.
    3. **Actionable**: If a user asks to CHANGE a limit or threshold, use the `set_device_threshold` tool.
    4. **Educational**: If asked about physics (V, I, P) or ML, provide clear, student-friendly explanations.
    5. **Currency**: Always use Ghana Cedis (GHC).
    
    Answer the user's question concisely based on the data provided.
    """
    
    if session_id not in chat_sessions:
        chat_sessions[session_id] = []
    
    chat_sessions[session_id].append({"role": "user", "content": question})
    
    messages = [{"role": "system", "content": system_prompt}] + chat_sessions[session_id]
    
    try:
        response = client.chat.completions.create(
            messages=messages,
            model="llama-3.1-8b-instant",
            tools=tools,
            tool_choice="auto"
        )
        
        response_message = response.choices[0].message
        
        # Handle Tool Calls
        if response_message.tool_calls:
            messages.append(response_message)
            
            for tool_call in response_message.tool_calls:
                function_name = tool_call.function.name
                function_args = json.loads(tool_call.function.arguments)
                print(f"DEBUG: Tool Call: {function_name} with args {function_args}")
                
                if function_name == "set_device_threshold":
                    result = crud.create_or_update_device(
                        db, 
                        device_id=function_args.get("device_id"),
                        threshold=float(function_args.get("threshold"))
                    )
                    tool_response = f"Successfully updated {result.id} threshold to {result.threshold}W."
                else:
                    tool_response = "Error: Unknown tool."
                    
                messages.append({
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": function_name,
                    "content": tool_response,
                })
            
            # Get final response from LLM after tool execution
            second_response = client.chat.completions.create(
                messages=messages,
                model="llama-3.1-8b-instant"
            )
            answer = second_response.choices[0].message.content
        else:
            answer = response_message.content
            
        chat_sessions[session_id].append({"role": "assistant", "content": answer})
        return answer
        
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"CRITICAL: Chatbot error: {e}")
        print(f"FULL TRACEBACK:\n{error_detail}")
        return "I'm sorry, I'm having trouble connecting to my brain right now. 🤯"

