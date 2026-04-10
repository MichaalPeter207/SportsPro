import requests
import json

BASE_URL = "http://127.0.0.1:5000"

# Test registration
test_data = {
    "username": "testuser",
    "email": "testuser@example.com",
    "password": "TestPassword123!",
    "first_name": "Test",
    "last_name": "User"
}

print("Testing registration endpoint...")
print(f"Data: {json.dumps(test_data, indent=2)}")

try:
    response = requests.post(
        f"{BASE_URL}/api/auth/register",
        json=test_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"\nStatus Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")
