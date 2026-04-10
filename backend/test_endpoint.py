#!/usr/bin/env python3
"""Test the tournament matches endpoint"""
import requests

try:
    r = requests.get('http://localhost:5000/api/tournaments/1/matches')
    print(f'Status: {r.status_code}')
    print(f'Content-Type: {r.headers.get("Content-Type")}')

    if r.status_code == 200:
        data = r.json()
        print(f'Success! Matches: {len(data.get("matches", []))}')
        if data.get('matches'):
            match = data['matches'][0]
            print(f'First match: {match.get("home_team")} vs {match.get("away_team")}')
            if 'prediction' in match and match['prediction']:
                pred = match['prediction']
                print(f'Prediction: Home {pred.get("home_win_prob")}, Draw {pred.get("draw_prob")}, Away {pred.get("away_win_prob")}')
    else:
        print(f'Error: {r.text[:500]}')

except Exception as e:
    print(f'Error: {e}')