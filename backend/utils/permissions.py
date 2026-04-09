# utils/permissions.py
# Lazy imports inside functions to avoid circular import at startup.


def get_roles(user):
    """Return normalised set of all roles from both users.role column and user_roles table."""
    if not user:
        return set()
    from models.models import UserRole
    roles = set()
    if user.role:
        roles.add(user.role.strip().lower())
    try:
        for r in UserRole.query.filter_by(user_id=user.user_id).all():
            if r.role:
                roles.add(r.role.strip().lower())
    except Exception:
        pass
    return roles


def is_admin(user):
    return 'admin' in get_roles(user)


def is_coach(user):
    roles = get_roles(user)
    return 'coach' in roles or 'admin' in roles


def can_manage(user):
    """True for admin or coach — checks both users.role column AND user_roles table."""
    roles = get_roles(user)
    return 'admin' in roles or 'coach' in roles