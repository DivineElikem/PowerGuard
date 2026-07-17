from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.api.endpoints import readings, analytics, forecast, chatbot, health, anomalies, devices
from app.services.mqtt_service import start_mqtt_listener, stop_mqtt_listener
from app.db.database import engine, Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Base.metadata.create_all(bind=engine)
    start_mqtt_listener()

    # # Trigger auto-migration if SQLite file is found
    # from app.utils.migration_logic import run_auto_migration, sync_postgres_sequences
    # run_auto_migration()
    # sync_postgres_sequences()

    # Start simulator if enabled
    if settings.START_SIMULATOR:
        from app.utils.mqtt_simulator import run_simulator
        import threading
        print("🚀 Starting MQTT Simulator...")
        simulator_thread = threading.Thread(target=run_simulator, daemon=True)
        simulator_thread.start()

    yield
    # Shutdown
    print("Shutting down...")
    stop_mqtt_listener()

app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

# Add CORS middleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)




# Include routers
app.include_router(readings.router, prefix="/readings", tags=["Readings"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(forecast.router, prefix="/forecast", tags=["Forecast"])
app.include_router(chatbot.router, prefix="/chatbot", tags=["Chatbot"])
app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(anomalies.router, prefix="/anomalies", tags=["Anomalies"])
app.include_router(devices.router, prefix="/devices", tags=["Devices"])

@app.get("/")
def root():
    return {"message": "Welcome to PowerGuard Backend"}
