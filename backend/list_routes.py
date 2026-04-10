#!/usr/bin/env python3
"""List all Flask routes"""
from app import create_app

app = create_app()

print("All Registered Routes:")
print("=" * 80)
for rule in app.url_map.iter_rules():
    if 'tournaments' in str(rule):
        print(f"{rule.rule:40} {rule.endpoint:20} {list(rule.methods - {'HEAD', 'OPTIONS'})}")

print("\n\nAll routes containing '/matches':")
print("=" * 80)
for rule in app.url_map.iter_rules():
    if 'matches' in str(rule):
        print(f"{rule.rule:40} {rule.endpoint:20} {list(rule.methods - {'HEAD', 'OPTIONS'})}")
