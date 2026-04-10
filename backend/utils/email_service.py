# =============================================================
#  utils/email_service.py
#  All email sending functions
# =============================================================

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text      import MIMEText
from flask import current_app


def _frontend_url():
    return current_app.config.get('FRONTEND_URL', 'http://localhost:3000').rstrip('/')


def _send(to_email: str, subject: str, html_body: str):
    """Internal helper — sends an HTML email via Gmail SMTP."""
    try:
        username = current_app.config['MAIL_USERNAME']
        password = current_app.config['MAIL_PASSWORD']

        msg                    = MIMEMultipart('alternative')
        msg['Subject']         = subject
        msg['From']            = f"SportsPro <{username}>"
        msg['To']              = to_email
        msg.attach(MIMEText(html_body, 'html'))

        # Add a timeout so registration/login doesn't hang if SMTP is slow
        with smtplib.SMTP_SSL('smtp.gmail.com', 465, timeout=10) as server:
            server.login(username, password)
            server.sendmail(username, to_email, msg.as_string())
    except Exception as e:
        current_app.logger.error(f"Email send error to {to_email}: {e}")


# -----------------------------------------------------------
# SEND 6-DIGIT VERIFICATION CODE
# -----------------------------------------------------------
def send_verification_email(to_email: str, username: str, code: str):
    subject = "SportsPro – Your Verification Code"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;
                background:#0f0f1a;color:#fff;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#6c63ff,#3b82f6);
                  padding:32px;text-align:center;">
        <h1 style="margin:0;font-size:28px;letter-spacing:2px;">SportsPro</h1>
        <p style="margin:4px 0 0;opacity:.8;">Email Verification</p>
      </div>
      <div style="padding:32px;text-align:center;">
        <p style="font-size:16px;">Hi <strong>{username}</strong>,</p>
        <p style="color:#aaa;">Use the code below to verify your email address.
           It expires in <strong>10 minutes</strong>.</p>
        <div style="background:#1a1a2e;border:2px solid #6c63ff;border-radius:12px;
                    padding:24px;margin:24px 0;letter-spacing:12px;
                    font-size:40px;font-weight:bold;color:#6c63ff;">
          {code}
        </div>
        <p style="color:#aaa;font-size:13px;">
          If you did not create a SportsPro account, ignore this email.
        </p>
      </div>
    </div>
    """
    _send(to_email, subject, html)


# -----------------------------------------------------------
# SEND ROLE UPGRADE NOTIFICATION
# -----------------------------------------------------------
def send_role_upgrade_email(to_email: str, username: str,
                             old_roles: list, new_roles: list):
    base_url = _frontend_url()
    old_str = ", ".join(r.capitalize() for r in old_roles) or "Fan"
    new_str = ", ".join(r.capitalize() for r in new_roles)

    # Build feature bullets based on new roles
    features = []
    if 'coach' in new_roles or 'admin' in new_roles:
        features += [
            "Create and manage matches with tournament titles",
            "Register teams and players",
            "Upload match results",
            "View full analytics and predictions",
        ]
    if 'analyst' in new_roles:
        features += ["Access detailed performance analytics and AI predictions"]
    if not features:
        features = ["View standings, fixtures, and live predictions"]

    bullets = "".join(f"<li style='margin:6px 0;'>{f}</li>" for f in features)

    subject = f"🎉 SportsPro – Your Role Has Been Upgraded to {new_str}"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;
                background:#0f0f1a;color:#fff;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#6c63ff,#3b82f6);
                  padding:32px;text-align:center;">
        <h1 style="margin:0;font-size:26px;letter-spacing:2px;">SportsPro</h1>
        <p style="margin:4px 0 0;opacity:.8;">Role Upgrade Notification</p>
      </div>
      <div style="padding:32px;">
        <p style="font-size:16px;">Hi <strong>{username}</strong>,</p>
        <p>Great news! Your account role has been updated by an administrator.</p>
        <div style="background:#1a1a2e;border-radius:10px;padding:20px;margin:20px 0;">
          <p style="margin:0 0 6px;color:#aaa;font-size:13px;">PREVIOUS ROLE</p>
          <p style="margin:0;font-size:18px;color:#f59e0b;font-weight:bold;">{old_str}</p>
        </div>
        <div style="background:#1a1a2e;border:2px solid #6c63ff;border-radius:10px;
                    padding:20px;margin:20px 0;">
          <p style="margin:0 0 6px;color:#aaa;font-size:13px;">NEW ROLE</p>
          <p style="margin:0;font-size:22px;color:#6c63ff;font-weight:bold;">{new_str}</p>
        </div>
        <p style="color:#ccc;">With your new role you can now:</p>
        <ul style="color:#ccc;padding-left:20px;">{bullets}</ul>
        <div style="text-align:center;margin-top:28px;">
          <a href="{base_url}"
             style="background:linear-gradient(135deg,#6c63ff,#3b82f6);
                    color:#fff;padding:14px 32px;border-radius:8px;
                    text-decoration:none;font-weight:bold;font-size:15px;">
            Log In Now
          </a>
        </div>
      </div>
    </div>
    """
    _send(to_email, subject, html)


# -----------------------------------------------------------
# SEND ADMIN ACTIVATION CODE
# -----------------------------------------------------------
def send_admin_activation_email(to_email: str, username: str, activation_code: str):
    subject = "SportsPro – Your Admin Activation Code"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;
                background:#0f0f1a;color:#fff;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#ef4444,#b91c1c);
                  padding:32px;text-align:center;">
        <h1 style="margin:0;font-size:26px;">SportsPro Admin</h1>
        <p style="opacity:.8;margin:4px 0 0;">Activation Code</p>
      </div>
      <div style="padding:32px;text-align:center;">
        <p>Hi <strong>{username}</strong>,</p>
        <p style="color:#aaa;">You have been granted <strong>Admin</strong> access.
           Keep this code secure — you may need it to re-register or activate features.</p>
        <div style="background:#1a1a2e;border:2px solid #ef4444;border-radius:10px;
                    padding:20px;margin:20px 0;font-size:20px;
                    letter-spacing:4px;color:#ef4444;font-weight:bold;">
          {activation_code}
        </div>
        <p style="color:#aaa;font-size:13px;">Do not share this code with anyone.</p>
      </div>
    </div>
    """
    _send(to_email, subject, html)


# -----------------------------------------------------------
# SEND PASSWORD RESET EMAIL
# -----------------------------------------------------------
def send_password_reset_email(to_email: str, username: str, token: str):
    base_url  = _frontend_url()
    reset_url = f"{base_url}?token={token}"
    subject   = "SportsPro – Password Reset Request"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;
                background:#0f0f1a;color:#fff;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#6c63ff,#3b82f6);
                  padding:32px;text-align:center;">
        <h1 style="margin:0;font-size:26px;">SportsPro</h1>
        <p style="opacity:.8;margin:4px 0 0;">Password Reset</p>
      </div>
      <div style="padding:32px;text-align:center;">
        <p>Hi <strong>{username}</strong>,</p>
        <p style="color:#aaa;">Click the button below to reset your password.
           This link expires in <strong>30 minutes</strong>.</p>
        <div style="margin:28px 0;">
          <a href="{reset_url}"
             style="background:linear-gradient(135deg,#6c63ff,#3b82f6);
                    color:#fff;padding:14px 32px;border-radius:8px;
                    text-decoration:none;font-weight:bold;font-size:15px;">
            Reset Password
          </a>
        </div>
        <p style="color:#aaa;font-size:13px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    </div>
    """
    _send(to_email, subject, html)
