#!/usr/bin/env python3
"""Test script to verify numpy float32 conversion fix"""
import requests
import json

BASE_URL = "http://localhost:5000/api"

def test_fixture_and_matches():
    """Test generating fixtures and retrieving matches"""
    
    # Test 1: Get tournament 1 matches - this was failing with numpy error
    print("\n[TEST 1] Retrieving matches from tournament 1...")
    try:
        response = requests.get(f"{BASE_URL}/tournaments/1/matches")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            matches = response.json()
            print(f"✓ Successfully retrieved {len(matches)} matches")
            if matches:
                first_match = matches[0]
                print(f"  First match: {first_match.get('match_id')} - "
                      f"{first_match.get('home_team')} vs {first_match.get('away_team')}")
                if 'prediction' in first_match and first_match['prediction']:
                    pred = first_match['prediction']
                    print(f"  Prediction: {pred.get('home_win_prob')} / {pred.get('draw_prob')} / {pred.get('away_win_prob')}")
        else:
            print(f"✗ Failed with status {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"✗ Error: {e}")
    
    # Test 2: Try to generate fixtures manually (would create predictions with numpy types)
    # This is just for documentation - we can't really test this without creating new tournament
    print("\n[TEST 2] Checking server health...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print(f"✓ Server is healthy")
            print(f"  Response: {response.json()}")
        else:
            print(f"✗ Unexpected status: {response.status_code}")
    except Exception as e:
        print(f"✗ Error: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("Testing numpy float32 conversion fix")
    print("=" * 60)
    test_fixture_and_matches()
    print("\n" + "=" * 60)
    print("Tests completed")
    print("=" * 60)
