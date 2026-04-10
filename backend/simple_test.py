import requests
r = requests.get('http://localhost:5000/api/health')
print('Health Status:', r.status_code)
print('Health Response:', r.text)