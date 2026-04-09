-- =============================================================
-- ADDITIONAL TABLES FOR EMAIL & MULTIPLE ROLES
-- Run these after the main schema
-- =============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified  BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_token VARCHAR(255);

DROP TABLE IF EXISTS user_roles CASCADE;
CREATE TABLE user_roles (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL
                CHECK (role IN ('admin','coach','referee','analyst','fan')),
    assigned_by INT REFERENCES users(user_id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, role)
);

DROP TABLE IF EXISTS notifications CASCADE;
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title           VARCHAR(100) NOT NULL,
    message         TEXT NOT NULL,
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user    ON user_roles(user_id);

-- =============================================================
-- FEEDBACK
-- =============================================================
CREATE TABLE IF NOT EXISTS feedback (
    feedback_id SERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(user_id) ON DELETE SET NULL,
    rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    message     TEXT,
    page        VARCHAR(100),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);
