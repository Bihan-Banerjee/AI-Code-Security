# ── app.py ─────────────────────────────────────────────────────────────────
from flask import Flask
from models import db
from routes import users_bp

def create_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///users.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)
    app.register_blueprint(users_bp)

    with app.app_context():
        db.create_all()          # creates users.db + table on first run

    return app

if __name__ == "__main__":
    create_app().run(debug=True)