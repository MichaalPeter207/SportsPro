# =============================================================
#  app.py — Main Flask Application
# =============================================================

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from extensions import db, bcrypt, jwt


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize extensions
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    CORS(
        app,
        resources={r"/api/*": {"origins": [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    # Register all blueprints
    from routes.auth        import auth_bp
    from routes.league      import league_bp
    from routes.team        import team_bp
    from routes.player      import player_bp
    from routes.match       import match_bp
    from routes.performance import perf_bp
    from routes.prediction  import prediction_bp
    from routes.analytics   import analytics_bp
    from routes.tournament  import tournament_bp
    from routes.feedback    import feedback_bp

    app.register_blueprint(auth_bp,        url_prefix='/api/auth')
    app.register_blueprint(league_bp,      url_prefix='/api/leagues')
    app.register_blueprint(team_bp,        url_prefix='/api/teams')
    app.register_blueprint(player_bp,      url_prefix='/api/players')
    app.register_blueprint(match_bp,       url_prefix='/api/matches')
    app.register_blueprint(perf_bp,        url_prefix='/api/performance')
    app.register_blueprint(prediction_bp,  url_prefix='/api/predictions')
    app.register_blueprint(analytics_bp,   url_prefix='/api/analytics')
    app.register_blueprint(tournament_bp,  url_prefix='/api/tournaments')
    app.register_blueprint(feedback_bp,    url_prefix='/api/feedback')

    @app.route('/api/health')
    def health():
        return jsonify({'status': 'Backend is running!', 'version': '1.0.0'})

    @app.route('/')
    def root():
        return jsonify({'status': 'ok'})

    return app


if __name__ == '__main__':
    print("Starting Sports League Management System Backend...")
    port = int(os.environ.get("PORT", 5000))
    print(f"Visit: http://0.0.0.0:{port}/api/health")
    app = create_app()
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG") == "1")


