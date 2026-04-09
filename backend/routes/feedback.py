# =============================================================
#  routes/feedback.py
#  Collect user feedback and ratings
# =============================================================

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.models import Feedback, User
from utils.permissions import is_admin

feedback_bp = Blueprint('feedback', __name__)


@feedback_bp.route('/', methods=['POST'])
@jwt_required(optional=True)
def submit_feedback():
    data = request.get_json() or {}
    rating = data.get('rating')
    message = (data.get('message') or '').strip()
    page = (data.get('page') or '').strip()

    if rating is None:
        return jsonify({'error': 'rating is required'}), 400
    try:
        rating = int(rating)
    except (TypeError, ValueError):
        return jsonify({'error': 'rating must be an integer'}), 400
    if rating < 1 or rating > 5:
        return jsonify({'error': 'rating must be between 1 and 5'}), 400

    uid = get_jwt_identity()
    user_id = None
    if uid:
        user = db.session.get(User, int(uid))
        if user:
            user_id = user.user_id

    fb = Feedback(
        user_id=user_id,
        rating=rating,
        message=message,
        page=page or None,
    )
    db.session.add(fb)
    db.session.commit()

    return jsonify({'message': 'Feedback submitted', 'feedback': fb.to_dict()}), 201


@feedback_bp.route('/', methods=['GET'])
@jwt_required()
def list_feedback():
    uid = get_jwt_identity()
    user = db.session.get(User, int(uid)) if uid else None
    if not is_admin(user):
        return jsonify({'error': 'Admins only'}), 403

    rows = Feedback.query.order_by(Feedback.created_at.desc()).limit(200).all()
    result = []
    for f in rows:
        d = f.to_dict()
        if f.user:
            d['username'] = f.user.username
            d['email'] = f.user.email
        result.append(d)

    return jsonify({'feedback': result}), 200
