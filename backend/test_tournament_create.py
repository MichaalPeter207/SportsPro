import requests
import json

BASE_URL = "http://127.0.0.1:5000"

# First, get a token (register/login)
print("Testing tournament creation...")

# Test creating a tournament (requires authentication)
tournament_data = {
    "title": "Test Tournament 2026",
    "season_name": "Season 2026",
    "description": "A test tournament"
}

try:
    response = requests.post(
        f"{BASE_URL}/api/tournaments/",
        json=tournament_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status Code: {response.status_code}")
    if response.status_code in [200, 201]:
        print("✓ Tournament creation working!")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    else:
        print(f"Response: {response.text[:500]}")
except Exception as e:
    print(f"Error: {e}")
