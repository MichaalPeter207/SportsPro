# =============================================================
#  config.py
# =============================================================

import os
from dotenv import load_dotenv
from datetime import timedelta
JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
load_dotenv()

class Config:
    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        'postgresql://postgres:Ify??0000@localhost:5432/sports_league_db'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'sports-league-super-secret-key-2024')

    # Flask
    DEBUG      = os.getenv('DEBUG', 'True') == 'True'
    SECRET_KEY = os.getenv('SECRET_KEY', 'flask-secret-key-2024')

    # -----------------------------------------------------------
    # ADMIN ACTIVATION CODE
    # Change this to your own secret code
    # -----------------------------------------------------------
    ADMIN_ACTIVATION_CODE = os.getenv('ADMIN_ACTIVATION_CODE', 'ISREAL-MICHAEL-2026')

    # -----------------------------------------------------------
    # EMAIL SETTINGS (Gmail)
    # Replace with your Gmail and App Password
    # NEVER commit your real password to GitHub
    # -----------------------------------------------------------
    MAIL_USERNAME = os.getenv('MAIL_USERNAME', 'ifymike207@gmail.com')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD', 'eaeo qnpu xihs umbm')