from fastapi.testclient import TestClient

from app.main import app, settings


client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_contributions_requires_token_when_server_has_no_fallback(monkeypatch) -> None:
    monkeypatch.setattr(settings, "github_token", None)
    response = client.post(
        "/api/contributions",
        json={
            "username": "octocat",
            "start_date": "2025-01-01",
            "end_date": "2025-01-31",
            "aggregation": "week",
        },
    )
    assert response.status_code == 401
    assert "Token" in response.json()["detail"]
