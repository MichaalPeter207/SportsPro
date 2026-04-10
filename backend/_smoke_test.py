import requests
from uuid import uuid4
BASE = "http://127.0.0.1:5000"

def hit(method, path, **kwargs):
    url = BASE + path
    try:
        r = requests.request(method, url, timeout=5, **kwargs)
        return r.status_code, r.headers.get("Content-Type"), r.text[:300]
    except Exception as e:
        return None, None, str(e)

print("[Smoke] GET /api/health")
print(hit("GET", "/api/health"))

print("[Smoke] GET /api/tournaments/")
print(hit("GET", "/api/tournaments/"))

print("[Smoke] GET /api/leagues/")
print(hit("GET", "/api/leagues/"))

print("[Smoke] POST /api/auth/register (fan)")
user = f"smoke_{uuid4().hex[:8]}"
payload = {"username": user, "email": f"{user}@example.com", "password": "TestPass123!"}
code, ctype, body = hit("POST", "/api/auth/register", json=payload, headers={"Content-Type":"application/json"})
print(code, ctype, body)

print("[Smoke] POST /api/auth/login (should be unverified)")
code, ctype, body = hit("POST", "/api/auth/login", json={"username": user, "password": "TestPass123!"}, headers={"Content-Type":"application/json"})
print(code, ctype, body)
