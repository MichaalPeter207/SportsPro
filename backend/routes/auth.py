# =============================================================
#  routes/auth.py
#  - Login accepts username case-insensitively
#  - /me endpoint for session restore on page refresh
#  - Full notifications support
# =============================================================

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from sqlalchemy import func
from extensions import db, bcrypt
from models.models import User, UserRole, Notification
from utils.email_service import (
    send_verification_email,
    send_role_upgrade_email,
    send_admin_activation_email,
    send_password_reset_email,
)
import secrets, random
from datetime import datetime, timedelta

auth_bp = Blueprint('auth', __name__)


def get_user():
    uid = get_jwt_identity()
    return db.session.get(User, int(uid)) if uid else None


def is_admin_or_coach(user):
    return user and (user.has_role('admin') or user.has_role('coach'))


# -----------------------------------------------------------
# REGISTER
# -----------------------------------------------------------
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    for field in ['username', 'email', 'password']:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    # Case-insensitive duplicate check
    if User.query.filter(func.lower(User.username) == data['username'].strip().lower()).first():
        return jsonify({'error': 'Username already taken'}), 409
    if User.query.filter(func.lower(User.email) == data['email'].strip().lower()).first():
        return jsonify({'error': 'Email already registered'}), 409

    requested_role  = data.get('role', 'fan')
    activation_code = data.get('activation_code', '').strip()
    correct_code    = current_app.config.get('ADMIN_ACTIVATION_CODE', '')

    if requested_role == 'admin':
        if not activation_code or activation_code != correct_code:
            return jsonify({'error': 'Invalid activation code. Please register as Fan instead.'}), 403
        assigned_role = 'admin'
    else:
        assigned_role = 'fan'

    code    = str(random.randint(100000, 999999))
    expires = datetime.utcnow() + timedelta(minutes=10)

    new_user = User(
        username            = data['username'].strip(),
        email               = data['email'].strip().lower(),
        password_hash       = bcrypt.generate_password_hash(data['password']).decode('utf-8'),
        role                = assigned_role,
        first_name          = data.get('first_name', '').strip(),
        last_name           = data.get('last_name',  '').strip(),
        is_verified         = False,
        verify_code         = code,
        verify_code_expires = expires,
    )
    db.session.add(new_user)
    db.session.flush()

    # Add to user_roles table
    db.session.add(UserRole(user_id=new_user.user_id, role=assigned_role))
    db.session.commit()

    try:
        send_verification_email(new_user.email, new_user.username, code)
    except Exception:
        pass

    return jsonify({
        'message': f'Account created! A 6-digit verification code has been sent to {new_user.email}.',
        'email':   new_user.email,
    }), 201


# -----------------------------------------------------------
# VERIFY EMAIL (6-digit code)
# -----------------------------------------------------------
@auth_bp.route('/verify-code', methods=['POST'])
def verify_code():
    data  = request.get_json()
    email = (data.get('email') or '').strip().lower()
    code  = (data.get('code')  or '').strip()

    if not email or not code:
        return jsonify({'error': 'Email and code are required'}), 400

    user = User.query.filter(func.lower(User.email) == email).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if user.is_verified:
        return jsonify({'message': 'Email already verified. Please log in.'}), 200
    if not user.verify_code or not user.verify_code_expires:
        return jsonify({'error': 'No verification code found. Please request a new one.'}), 400
    if datetime.utcnow() > user.verify_code_expires:
        return jsonify({'error': 'Verification code has expired. Please request a new one.'}), 400
    if user.verify_code != code:
        return jsonify({'error': 'Invalid verification code. Please try again.'}), 400

    user.is_verified         = True
    user.verify_code         = None
    user.verify_code_expires = None
    db.session.commit()
    return jsonify({'message': 'Email verified successfully! You can now log in.'}), 200


# -----------------------------------------------------------
# RESEND VERIFICATION CODE
# -----------------------------------------------------------
@auth_bp.route('/resend-code', methods=['POST'])
def resend_code():
    data  = request.get_json()
    email = (data.get('email') or '').strip().lower()
    if not email:
        return jsonify({'error': 'Email is required'}), 400

    user = User.query.filter(func.lower(User.email) == email).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if user.is_verified:
        return jsonify({'message': 'Email already verified.'}), 200

    code    = str(random.randint(100000, 999999))
    expires = datetime.utcnow() + timedelta(minutes=10)
    user.verify_code         = code
    user.verify_code_expires = expires
    db.session.commit()

    try:
        send_verification_email(user.email, user.username, code)
    except Exception:
        pass
    return jsonify({'message': 'New verification code sent to your email.'}), 200


# -----------------------------------------------------------
# LEGACY LINK-BASED VERIFY (backward compat)
# -----------------------------------------------------------
@auth_bp.route('/verify-email/<token>', methods=['GET'])
def verify_email(token):
    user = User.query.filter_by(verify_token=token).first()
    if not user:
        return jsonify({'error': 'Invalid or expired verification link'}), 400
    user.is_verified  = True
    user.verify_token = None
    db.session.commit()
    return jsonify({'message': 'Email verified successfully! You can now log in.'}), 200


# -----------------------------------------------------------
# LOGIN  (case-insensitive username + whitespace trimmed)
# -----------------------------------------------------------
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password are required'}), 400

    username_input = data['username'].strip()

    # Case-insensitive lookup — try exact first, then lower()
    user = User.query.filter_by(username=username_input).first()
    if not user:
        user = User.query.filter(func.lower(User.username) == username_input.lower()).first()

    if not user:
        return jsonify({'error': 'Invalid username or password'}), 401

    try:
        password_ok = bcrypt.check_password_hash(user.password_hash.strip(), data['password'])
    except Exception:
        password_ok = False

    if not password_ok:
        return jsonify({'error': 'Invalid username or password'}), 401
    if not user.is_active:
        return jsonify({'error': 'Account deactivated. Contact admin.'}), 403
    if not user.is_verified:
        return jsonify({'error': 'Please verify your email before logging in.', 'unverified': True, 'email': user.email}), 403

    access_token = create_access_token(identity=str(user.user_id))
    roles  = user.get_roles()
    unread = Notification.query.filter_by(user_id=user.user_id, is_read=False).count()

    user_data                        = user.to_dict()
    user_data['roles']               = roles
    user_data['unread_notifications']= unread

    return jsonify({'message': 'Login successful', 'access_token': access_token, 'user': user_data}), 200


# -----------------------------------------------------------
# GET CURRENT USER  — used by frontend to restore session on refresh
# -----------------------------------------------------------
@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user = get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    roles  = user.get_roles()
    unread = Notification.query.filter_by(user_id=user.user_id, is_read=False).count()
    data                          = user.to_dict()
    data['roles']                 = roles
    data['unread_notifications']  = unread
    return jsonify({'user': data}), 200


# -----------------------------------------------------------
# WHOAMI (debug)
# -----------------------------------------------------------
@auth_bp.route('/whoami', methods=['GET'])
@jwt_required()
def whoami():
    user = get_user()
    if not user: return jsonify({'error': 'Not found'}), 404
    roles = [r.role for r in UserRole.query.filter_by(user_id=user.user_id).all()]
    can   = user.role in ('admin','coach') or any(r in ('admin','coach') for r in roles)
    return jsonify({'user_id':user.user_id,'username':user.username,'users_role_col':user.role,'user_roles_table':roles,'can_manage':can}), 200


# -----------------------------------------------------------
# ASSIGN ROLES — Admin only
# -----------------------------------------------------------
@auth_bp.route('/assign-roles', methods=['PUT'])
@jwt_required()
def assign_roles():
    admin = get_user()
    if not admin or not admin.has_role('admin'):
        return jsonify({'error': 'Only admins can assign roles'}), 403

    data            = request.get_json()
    target_username = (data.get('username') or '').strip()
    new_roles       = data.get('roles', [])

    if not target_username or not new_roles:
        return jsonify({'error': 'username and roles are required'}), 400

    allowed_roles = ['admin', 'coach', 'analyst', 'fan']
    for r in new_roles:
        if r not in allowed_roles:
            return jsonify({'error': f'Invalid role: {r}'}), 400

    target = User.query.filter(func.lower(User.username) == target_username.lower()).first()
    if not target:
        return jsonify({'error': f'User "{target_username}" not found'}), 404

    # Capture old roles before clearing
    old_roles = target.get_roles() or ['fan']

    # Clear existing roles
    UserRole.query.filter_by(user_id=target.user_id).delete()

    # Assign new roles
    priority = ['admin','coach','analyst','fan']
    for r in new_roles:
        db.session.add(UserRole(user_id=target.user_id, role=r, assigned_by=admin.user_id))

    # Set primary role = highest priority
    for p in priority:
        if p in new_roles:
            target.role = p
            break

    # Notify target user in-app
    db.session.add(Notification(
        user_id=target.user_id,
        title='🎉 Role Upgraded',
        message=f'Your role has been updated to: {", ".join(r.capitalize() for r in new_roles)} by admin {admin.username}. Log out and back in to access your new features.',
    ))
    db.session.commit()

    # Send email notification
    try:
        send_role_upgrade_email(target.email, target.username, old_roles, new_roles)
    except Exception as e:
        current_app.logger.error(f"Role email failed: {e}")

    return jsonify({'message': f'Roles for {target.username} updated to {new_roles}', 'user': target.to_dict()}), 200


# -----------------------------------------------------------
# GET ALL USERS — Admin only
# -----------------------------------------------------------
@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    admin = get_user()
    if not admin or not admin.has_role('admin'):
        return jsonify({'error': 'Admins only'}), 403
    users = User.query.order_by(User.created_at.desc()).all()
    result = []
    for u in users:
        d = u.to_dict()
        d['roles'] = u.get_roles()
        result.append(d)
    return jsonify({'users': result}), 200


# -----------------------------------------------------------
# NOTIFICATIONS
# -----------------------------------------------------------
@auth_bp.route('/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    user = get_user()
    if not user: return jsonify({'error': 'Unauthorized'}), 401
    notifs = Notification.query.filter_by(user_id=user.user_id).order_by(Notification.created_at.desc()).limit(50).all()
    return jsonify({'notifications': [n.to_dict() for n in notifs]}), 200


@auth_bp.route('/notifications/read', methods=['PUT'])
@jwt_required()
def mark_read():
    user = get_user()
    if not user: return jsonify({'error': 'Unauthorized'}), 401
    Notification.query.filter_by(user_id=user.user_id, is_read=False).update({'is_read': True})
    db.session.commit()
    return jsonify({'message': 'Marked as read'}), 200


# -----------------------------------------------------------
# PASSWORD RESET REQUEST
# /forgot-password and /request-reset both work
# -----------------------------------------------------------
@auth_bp.route('/request-reset', methods=['POST'])
@auth_bp.route('/forgot-password', methods=['POST'])
def request_reset():
    data  = request.get_json()
    email = (data.get('email') or '').strip().lower()
    if not email:
        return jsonify({'error': 'Email is required'}), 400

    user = User.query.filter(func.lower(User.email) == email).first()
    if not user:
        # Always return 200 so we don't leak which emails exist
        return jsonify({'message': 'If that email exists, a reset link has been sent.'}), 200

    token   = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(hours=1)
    user.verify_token        = token
    user.verify_code_expires = expires
    db.session.commit()

    try:
        send_password_reset_email(user.email, user.username, token)
    except Exception as e:
        current_app.logger.error(f"Reset email failed: {e}")

    return jsonify({'message': 'If that email exists, a reset link has been sent.'}), 200


# -----------------------------------------------------------
# PASSWORD RESET CONFIRM
# -----------------------------------------------------------
@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data     = request.get_json()
    token    = (data.get('token')    or '').strip()
    password = (data.get('password') or '').strip()

    if not token or not password:
        return jsonify({'error': 'Token and new password are required'}), 400

    user = User.query.filter_by(verify_token=token).first()
    if not user:
        return jsonify({'error': 'Invalid or expired reset token'}), 400
    if user.verify_code_expires and datetime.utcnow() > user.verify_code_expires:
        return jsonify({'error': 'Reset token has expired. Please request a new one.'}), 400

    user.password_hash       = bcrypt.generate_password_hash(password).decode('utf-8')
    user.verify_token        = None
    user.verify_code_expires = None
    db.session.commit()
    return jsonify({'message': 'Password reset successfully! You can now log in.'}), 200


# -----------------------------------------------------------
# DEACTIVATE USER — Admin only
# -----------------------------------------------------------
@auth_bp.route('/users/<int:user_id>/deactivate', methods=['PUT'])
@jwt_required()
def deactivate_user(user_id):
    admin = get_user()
    if not admin or not admin.has_role('admin'):
        return jsonify({'error': 'Admins only'}), 403
    target = db.session.get(User, user_id)
    if not target:
        return jsonify({'error': 'User not found'}), 404
    target.is_active = not target.is_active
    db.session.commit()
    status = "activated" if target.is_active else "deactivated"
    return jsonify({'message': f'User {target.username} {status}', 'is_active': target.is_active}), 200