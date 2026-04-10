#!/usr/bin/env python3
"""Detailed test of the tournament matches endpoint"""
import requests
import json
import traceback

BASE_URL = "http://localhost:5000/api"

print("=" * 60)
print("Detailed Endpoint Test")
print("=" * 60)

try:
    print("\n[TEST] GET /api/tournaments/1/matches")
    response = requests.get(f"{BASE_URL}/tournaments/1/matches", timeout=5)
    print(f"Status Code: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    print(f"Response Length: {len(response.text)}")
    
    if response.status_code == 200:
        print("✓ Success!")
        data = response.json()
        print(f"  Matches: {len(data.get('matches', []))}")
    else:
        print(f"✗ Error status: {response.status_code}")
        print(f"Response:\n{response.text[:1000]}")
        
        # Try to extract error details
        if 'Traceback' in response.text:
            lines = response.text.split('\n')
            for i, line in enumerate(lines):
                if 'Traceback' in line or 'Error' in line or 'Exception' in line:
                    print(f"  {line}")
    
except Exception as e:
    print(f"✗ Connection error: {e}")
    traceback.print_exc()
