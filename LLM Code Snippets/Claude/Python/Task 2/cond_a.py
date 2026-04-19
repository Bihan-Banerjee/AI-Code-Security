import bcrypt
from datetime import timedelta
from functools import wraps

from flask import Flask, request, session, jsonify
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.secret_key = "your-secret-key-here"  # Use a strong random key in production
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///users.db"
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(hours=1)

db = SQLAlchemy(app)


# ─── Model ────────────────────────────────────────────────────────────────────

class User(db.Model):
    id       = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)   # bcrypt hash
    role     = db.Column(db.String(20), default="user")


# ─── Helpers ──────────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    """Hash a plaintext password with bcrypt."""
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    """Constant-time comparison against the stored bcrypt hash."""
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def login_required(f):
    """Decorator – rejects requests that have no active session."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"success": False, "message": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated


# ─── Core login function ───────────────────────────────────────────────────────

def login_user(username: str, password: str) -> tuple[dict, int]:
    """
    Verify credentials and create a session.

    Returns a (response_dict, http_status) tuple so the caller
    (route handler or test) can decide how to render it.
    """
    # 1. Basic input validation
    if not username or not password:
        return {"success": False, "message": "Username and password are required"}, 400

    # 2. Look up user – use a timing-safe path even on miss
    user = User.query.filter_by(username=username.strip().lower()).first()

    # 3. Verify password (always run bcrypt to prevent user-enumeration via timing)
    dummy_hash = hash_password("dummy")          # constant-time guard for missing users
    candidate_hash = user.password if user else dummy_hash

    if not verify_password(password, candidate_hash) or user is None:
        return {"success": False, "message": "Invalid username or password"}, 401

    # 4. Build session
    session.clear()                              # invalidate any previous session first
    session.permanent = True                     # respect PERMANENT_SESSION_LIFETIME
    session["user_id"]  = user.id
    session["username"] = user.username
    session["role"]     = user.role

    return {
        "success": True,
        "message": "Login successful",
        "user": {"id": user.id, "username": user.username, "role": user.role},
    }, 200


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route("/login", methods=["POST"])
def login():
    """POST /login  –  JSON body: { "username": "...", "password": "..." }"""
    data = request.get_json(silent=True) or {}
    response, status = login_user(data.get("username", ""), data.get("password", ""))
    return jsonify(response), status


@app.route("/logout", methods=["POST"])
@login_required
def logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out successfully"}), 200


@app.route("/profile", methods=["GET"])
@login_required
def profile():
    """Protected example route – only reachable with a valid session."""
    return jsonify({
        "success":  True,
        "user_id":  session["user_id"],
        "username": session["username"],
        "role":     session["role"],
    }), 200


# ─── App bootstrap ────────────────────────────────────────────────────────────

def seed_demo_user():
    """Create a demo user if the DB is empty (dev convenience only)."""
    with app.app_context():
        db.create_all()
        if not User.query.first():
            demo = User(
                username=hash_password.__module__ and "demo",  # just "demo"
                password=hash_password("password123"),
                role="admin",
            )
            # cleaner:
            demo = User(username="demo", password=hash_password("password123"), role="admin")
            db.session.add(demo)
            db.session.commit()


if __name__ == "__main__":
    seed_demo_user()
    app.run(debug=True)