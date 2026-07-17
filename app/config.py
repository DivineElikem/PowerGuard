from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "PowerGuard Backend"
    APP_ENV: str = "development"
    DATABASE_URL: str = "sqlite:///./energy_meter.db"
    MQTT_BROKER: str = "broker.hivemq.com"  # Public broker for testing, or localhost
    MQTT_PORT: int = 1883
    MQTT_TOPIC: str = "sensor/energy"
    GROQ_API_KEY: str = ""
    START_SIMULATOR: bool = True
    FIREBASE_SERVICE_ACCOUNT: str = "app/utils/smart-energy-meter-4a732-firebase-adminsdk-fbsvc-dbd5bd6660.json"
    FIREBASE_SERVICE_ACCOUNT_JSON: str = "" # Full JSON string for production
    FIREBASE_DATABASE_URL: str = "https://smart-energy-meter-4a732-default-rtdb.firebaseio.com/"

    class Config:
        env_file = ".env"

settings = Settings()

# The DATABASE_URL default is SQLite, and an unset or misnamed env var would
# otherwise start the app against a container-local file that is wiped on every
# restart, losing writes silently. Fail startup instead.
#
# Checked out here rather than in a model_validator: pydantic renders the whole
# input dict (including GROQ_API_KEY) into ValidationError messages.
if settings.APP_ENV == "production" and not settings.DATABASE_URL.startswith(
    ("postgresql://", "postgres://")
):
    raise RuntimeError(
        "APP_ENV=production requires DATABASE_URL to be a PostgreSQL connection "
        f"string, got: {settings.DATABASE_URL.split('://')[0]}://..."
    )
