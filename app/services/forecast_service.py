from sqlalchemy import func
from datetime import datetime, timedelta
import pandas as pd
from prophet import Prophet
from sqlalchemy.orm import Session
from app.db.models import Reading

def generate_forecast(db: Session, days: int = 7):
    """Generates energy usage forecast for the next N days using hourly aggregation."""
    
    # Efficiently aggregate energy by hour in SQL
    # Power (W) = V * I. Energy (Wh) = W * (hours). 
    # Since readings are roughly every 10s (1/360 hours), weight is 1/360.
    # To get kWh, divide by 1000. Total factor: 1/360000.
    
    # Handle different database dialects for hourly grouping
    if db.bind.dialect.name == 'postgresql':
        group_col = func.to_char(Reading.timestamp, 'YYYY-MM-DD"T"HH24:00:00')
    else:  # Default to SQLite
        group_col = func.strftime('%Y-%m-%dT%H:00:00', Reading.timestamp)

    hourly_readings = db.query(
        group_col.label('hour'),
        func.sum(Reading.voltage * Reading.current * 10 / 3600000).label('energy_kwh')
    ).group_by('hour').all()
    
    if not hourly_readings or len(hourly_readings) < 5:
        return {"message": "Not enough data points for reliable forecast"}

    data = [{"ds": r.hour, "y": r.energy_kwh} for r in hourly_readings]
    df = pd.DataFrame(data)
    df['ds'] = pd.to_datetime(df['ds'])

    m = Prophet(interval_width=0.95, yearly_seasonality=False, weekly_seasonality=True, daily_seasonality=True)
    m.fit(df)
    
    future = m.make_future_dataframe(periods=days * 24, freq='h')
    forecast = m.predict(future)
    
    result = forecast[['ds', 'yhat']].tail(days * 24)
    
    forecast_data = []
    for _, row in result.iterrows():
        # Align with frontend expectations: 'date' and 'predicted_energy'
        forecast_data.append({
            "date": row['ds'].strftime('%Y-%m-%d %H:%M'),
            "predicted_energy": round(max(0, row['yhat']), 4)
        })
        
    # Generate dynamic insights
    outlook = "Stable usage expected for the coming days."
    tip = "Maintain your current energy-saving habits!"
    
    if len(forecast_data) >= 48: # Need at least 2 days of forecast
        today_total = sum(d['predicted_energy'] for d in forecast_data[:24])
        tomorrow_total = sum(d['predicted_energy'] for d in forecast_data[24:48])
        
        if today_total > 0:
            diff = ((tomorrow_total - today_total) / today_total) * 100
            if diff > 5:
                outlook = f"Predicted {abs(round(diff, 1))}% increase in usage tomorrow compared to today."
                tip = "Consider turning off non-essential appliances during peak hours to save on costs."
            elif diff < -5:
                outlook = f"Great news! We expect a {abs(round(diff, 1))}% decrease in your energy usage tomorrow."
                tip = "Keep up the efficient usage patterns you've established!"
            else:
                outlook = "Your energy usage is expected to remain steady tomorrow."
                
        # Find peak hour for tip
        tomorrow_data = forecast_data[24:48]
        peak_reading = max(tomorrow_data, key=lambda x: x['predicted_energy'])
        peak_hour = datetime.strptime(peak_reading['date'], '%Y-%m-%d %H:%M').strftime('%I:%M %p')
        
        if peak_reading['predicted_energy'] > 0.5: # Only warn if significant
            tip = f"Heads up: Your peak usage tomorrow is predicted at {peak_hour}. Shifting heavy tasks away from this time can save you ~GHC {(peak_reading['predicted_energy'] * 0.3 * 2.2).toFixed(2) if hasattr(peak_reading['predicted_energy'], 'toFixed') else round(peak_reading['predicted_energy'] * 0.3 * 2.2, 2)}."

    return {
        "forecast": forecast_data,
        "outlook": outlook,
        "tip": tip
    }

