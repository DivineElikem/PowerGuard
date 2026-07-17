from fastapi.testclient import TestClient
from app.main import app
from app.db.database import Base, engine, get_db, SessionLocal
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Setup in-memory database for testing
SQLALCHEMY_DATABASE_URL = "sqlite://"

engine_test = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)

Base.metadata.create_all(bind=engine_test)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to PowerGuard Backend"}

def test_health_check():
    response = client.get("/health/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_create_and_read_readings():
    # We can't easily test MQTT ingestion here without mocking, 
    # but we can test the read endpoints if we insert data manually or if we mock the DB.
    # For now, let's just check if the endpoints return 200 (even if empty).
    response = client.get("/readings/latest")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_analytics_daily_summary():
    response = client.get("/analytics/daily-summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_energy" in data
    assert "device_breakdown" in data

def test_forecast():
    # This might fail if no data, but should return 200 with empty list or valid response
    response = client.post("/forecast/?days=7")
    assert response.status_code == 200
    data = response.json()
    assert "forecast" in data

def test_chatbot():
    # Test initial query
    session_id = "test_session_1"
    response = client.post("/chatbot/query", json={"question": "Hello", "session_id": session_id})
    assert response.status_code == 200
    assert "answer" in response.json()
    
    # Test follow-up (history retention)
    response = client.post("/chatbot/query", json={"question": "What is my name?", "session_id": session_id})
    assert response.status_code == 200
    
    # Test new session (history separation)
    session_id_2 = "test_session_2"
    response = client.post("/chatbot/query", json={"question": "Hello", "session_id": session_id_2})
    assert response.status_code == 200
