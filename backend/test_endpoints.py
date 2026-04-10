import requests
import json

BASE_URL = "http://127.0.0.1:5000"

# Test health endpoint first
print("Testing health endpoint...")
try:
    response = requests.get(f"{BASE_URL}/api/health")
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("✓ Health endpoint working!")
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
    else:
        print(f"Error: {response.text[:500]}")
except Exception as e:
    print(f"Error: {e}")

# Test matches endpoint
print("\nTesting matches endpoint...")
try:
    response = requests.get(f"{BASE_URL}/api/tournaments/1/matches")
    print(f"Status Code: {response.status_code}")
    print(f"Content-Type: {response.headers.get('Content-Type')}")

    if response.status_code == 200:
        print("✓ Matches endpoint working!")
        try:
            data = response.json()
            print(f"Response keys: {list(data.keys()) if isinstance(data, dict) else type(data)}")
            if 'matches' in data:
                print(f"Found {len(data['matches'])} matches")
                if data['matches']:
                    match = data['matches'][0]
                    print(f"First match: {match.get('home_team')} vs {match.get('away_team')}")
                    if 'prediction' in match and match['prediction']:
                        pred = match['prediction']
                        print(f"Prediction: Home {pred.get('home_win_prob')}, Draw {pred.get('draw_prob')}, Away {pred.get('away_win_prob')}")
        except json.JSONDecodeError as e:
            print(f"JSON decode error: {e}")
            print(f"Raw response: {response.text[:500]}")
    else:
        print(f"Error: {response.text[:500]}")
except Exception as e:
    print(f"Error: {e}")
