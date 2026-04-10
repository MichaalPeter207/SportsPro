from app import create_app

app = create_app()
with app.test_client() as c:
    r = c.get('/api/tournaments/1/matches')
    print('Status', r.status_code)
    print('Content-Type', r.content_type)
    print('Data:', r.get_data(as_text=True))
