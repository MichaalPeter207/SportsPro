import requests
import json

BASE_URL = "http://127.0.0.1:5000"

# Test generating fixtures with predictions
print("Testing fixture generation with predictions...")

data = {
    "start_date": "2026-04-15",
    "days_between_rounds": 7,
    "venue": "Main Stadium"
}

try:
    response = requests.post(
        f"{BASE_URL}/api/tournaments/1/generate-fixtures",
        json=data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status Code: {response.status_code}")
    result = response.json()
    if response.status_code in [200, 201]:
        print("✓ Fixture generation successful!")
        print(f"Response: {json.dumps(result, indent=2)}")
    else:
        print(f"Response: {result}")
except Exception as e:
    print(f"Error: {e}")

# Test retrieving matches (this was failing before due to numpy issue)
print("\n\nTesting getting tournament matches...")
try:
    response = requests.get(f"{BASE_URL}/api/tournaments/1/matches")
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("✓ Matches retrieved successfully!")
        data = response.json()
        if 'matches' in data:
            print(f"Found {len(data['matches'])} matches")
            if data['matches']:
                m = data['matches'][0]
                print(f"First match keys: {list(m.keys())}")
    else:
        print(f"Error: {response.text[:300]}")
except Exception as e:
    print(f"Error: {e}")
