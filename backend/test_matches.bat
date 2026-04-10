@echo off
cd c:\Users\USER\Documents\GitHub\SportsPro\backend
call c:\Users\USER\Documents\GitHub\SportsPro\.venv\Scripts\activate.bat
python -c "import requests; r = requests.get('http://localhost:5000/api/tournaments/1/matches'); print('Status:', r.status_code); print('Response:', r.text[:200])"
pause