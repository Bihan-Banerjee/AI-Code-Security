# ===== cond_a/app.py =====
"""
app.py
------
Minimal Flask app demonstrating how to wire up user_repository.py.

Install dependencies:
    pip install flask flask-sqlalchemy

Run:
    python app.py
"""

from flask import Flask, jsonify, request
from user_repository import db, UserRepository

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///dev.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)
repo = UserRepository()


@app.before_request
def create_tables():
    db.create_all()


# ── CREATE ──────────────────────────────────────────────────────────────────
@app.post("/users")
def create_user():
    data = request.get_json(force=True)
    try:
        user = repo.create(
            username=data["username"],
            email=data["email"],
            full_name=data.get("full_name"),
        )
        return jsonify(user.to_dict()), 201
    except (ValueError, KeyError) as exc:
        return jsonify({"error": str(exc)}), 400


# ── READ (list) ──────────────────────────────────────────────────────────────
@app.get("/users")
def list_users():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    result = repo.paginate(page=page, per_page=per_page)
    result["items"] = [u.to_dict() for u in result["items"]]
    return jsonify(result)


# ── READ (single) ────────────────────────────────────────────────────────────
@app.get("/users/<int:user_id>")
def get_user(user_id):
    user = repo.get_by_id(user_id)
    if user is None:
        return jsonify({"error": "User not found."}), 404
    return jsonify(user.to_dict())


# ── UPDATE ───────────────────────────────────────────────────────────────────
@app.patch("/users/<int:user_id>")
def update_user(user_id):
    data = request.get_json(force=True)
    try:
        user = repo.update(user_id, **data)
        return jsonify(user.to_dict())
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


# ── DELETE ───────────────────────────────────────────────────────────────────
@app.delete("/users/<int:user_id>")
def delete_user(user_id):
    deleted = repo.delete(user_id)
    if not deleted:
        return jsonify({"error": "User not found."}), 404
    return "", 204


if __name__ == "__main__":
    app.run(debug=True)

# ===== cond_a/test_user.py =====
"""
test_user_repository.py
-----------------------
Pytest suite for UserRepository.  Uses an in-memory SQLite database so
no external infrastructure is required.

Run:
    pip install flask flask-sqlalchemy pytest
    pytest test_user_repository.py -v
"""

import pytest
from flask import Flask
from user_repository import db, User, UserRepository


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture()
def app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    db.init_app(app)
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture()
def repo(app):
    with app.app_context():
        yield UserRepository()


@pytest.fixture()
def sample_user(repo, app):
    with app.app_context():
        return repo.create(username="alice", email="alice@example.com", full_name="Alice A.")


# ── Create ────────────────────────────────────────────────────────────────────

def test_create_user(repo, app):
    with app.app_context():
        user = repo.create(username="bob", email="bob@example.com")
        assert user.id is not None
        assert user.username == "bob"
        assert user.email == "bob@example.com"
        assert user.is_active is True


def test_create_duplicate_username_raises(repo, app):
    with app.app_context():
        repo.create(username="dup", email="dup1@example.com")
        with pytest.raises(ValueError, match="already exists"):
            repo.create(username="dup", email="dup2@example.com")


def test_create_duplicate_email_raises(repo, app):
    with app.app_context():
        repo.create(username="user1", email="shared@example.com")
        with pytest.raises(ValueError, match="already exists"):
            repo.create(username="user2", email="shared@example.com")


def test_create_empty_username_raises(repo, app):
    with app.app_context():
        with pytest.raises(ValueError, match="username must not be empty"):
            repo.create(username="  ", email="x@example.com")


# ── Read ──────────────────────────────────────────────────────────────────────

def test_get_by_id(repo, app, sample_user):
    with app.app_context():
        user = repo.get_by_id(sample_user.id)
        assert user is not None
        assert user.username == "alice"


def test_get_by_id_not_found(repo, app):
    with app.app_context():
        assert repo.get_by_id(9999) is None


def test_get_by_username(repo, app, sample_user):
    with app.app_context():
        user = repo.get_by_username("alice")
        assert user.email == "alice@example.com"


def test_get_by_email_case_insensitive(repo, app, sample_user):
    with app.app_context():
        user = repo.get_by_email("ALICE@EXAMPLE.COM")
        assert user is not None
        assert user.username == "alice"


def test_get_all(repo, app):
    with app.app_context():
        repo.create(username="u1", email="u1@example.com")
        repo.create(username="u2", email="u2@example.com", is_active=False)
        all_users = repo.get_all()
        active_users = repo.get_all(active_only=True)
        assert len(all_users) == 2
        assert len(active_users) == 1


def test_paginate(repo, app):
    with app.app_context():
        for i in range(5):
            repo.create(username=f"p{i}", email=f"p{i}@example.com")
        result = repo.paginate(page=1, per_page=3)
        assert len(result["items"]) == 3
        assert result["total"] == 5
        assert result["has_next"] is True
        assert result["has_prev"] is False


# ── Update ────────────────────────────────────────────────────────────────────

def test_update_email(repo, app, sample_user):
    with app.app_context():
        updated = repo.update(sample_user.id, email="new@example.com")
        assert updated.email == "new@example.com"


def test_update_unknown_field_raises(repo, app, sample_user):
    with app.app_context():
        with pytest.raises(ValueError, match="Unknown field"):
            repo.update(sample_user.id, password="secret")


def test_update_nonexistent_user_raises(repo, app):
    with app.app_context():
        with pytest.raises(ValueError, match="No user found"):
            repo.update(9999, email="x@example.com")


# ── Delete ────────────────────────────────────────────────────────────────────

def test_delete_user(repo, app, sample_user):
    with app.app_context():
        result = repo.delete(sample_user.id)
        assert result is True
        assert repo.get_by_id(sample_user.id) is None


def test_delete_nonexistent_returns_false(repo, app):
    with app.app_context():
        assert repo.delete(9999) is False


def test_deactivate(repo, app, sample_user):
    with app.app_context():
        user = repo.deactivate(sample_user.id)
        assert user.is_active is False
        # Row still exists
        assert repo.get_by_id(sample_user.id) is not None


# ── to_dict ───────────────────────────────────────────────────────────────────

def test_to_dict_keys(repo, app):
    with app.app_context():
        user = repo.create(username="charlie", email="charlie@example.com")
        d = user.to_dict()
        expected_keys = {"id", "username", "email", "full_name", "is_active", "created_at", "updated_at"}
        assert expected_keys == set(d.keys())

# ===== cond_a/user.py =====
"""
user_repository.py
------------------
Flask-SQLAlchemy module for User entity CRUD operations.

Usage
-----
    from user_repository import db, User, UserRepository

    # In your Flask app factory:
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///app.db"
    db.init_app(app)

    with app.app_context():
        db.create_all()

    repo = UserRepository()
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

# ---------------------------------------------------------------------------
# Shared SQLAlchemy instance
# ---------------------------------------------------------------------------
db = SQLAlchemy()


# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------
class User(db.Model):
    """ORM model representing the `users` table."""

    __tablename__ = "users"

    id: db.Mapped[int] = db.mapped_column(db.Integer, primary_key=True)
    username: db.Mapped[str] = db.mapped_column(
        db.String(80), unique=True, nullable=False, index=True
    )
    email: db.Mapped[str] = db.mapped_column(
        db.String(120), unique=True, nullable=False, index=True
    )
    full_name: db.Mapped[Optional[str]] = db.mapped_column(db.String(200), nullable=True)
    is_active: db.Mapped[bool] = db.mapped_column(db.Boolean, default=True, nullable=False)
    created_at: db.Mapped[datetime] = db.mapped_column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: db.Mapped[datetime] = db.mapped_column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def to_dict(self) -> dict:
        """Return a JSON-serialisable representation of the user."""
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<User id={self.id} username={self.username!r}>"


# ---------------------------------------------------------------------------
# Repository
# ---------------------------------------------------------------------------
class UserRepository:
    """
    Thin repository layer that wraps SQLAlchemy session management for
    User CRUD operations.

    All public methods raise ``ValueError`` for bad input and
    ``RuntimeError`` (wrapping the original ``SQLAlchemyError``) for
    database failures, so callers never need to import SQLAlchemy directly.
    """

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------
    def create(
        self,
        username: str,
        email: str,
        full_name: Optional[str] = None,
        is_active: bool = True,
    ) -> User:
        """
        Insert a new user record.

        Parameters
        ----------
        username:   Unique username (max 80 chars).
        email:      Unique e-mail address (max 120 chars).
        full_name:  Optional display name (max 200 chars).
        is_active:  Account status flag (default True).

        Returns
        -------
        The newly created and committed ``User`` instance.

        Raises
        ------
        ValueError:     If ``username`` or ``email`` is empty / too long,
                        or if either already exists in the database.
        RuntimeError:   On unexpected database errors.
        """
        username = username.strip()
        email = email.strip().lower()

        if not username:
            raise ValueError("username must not be empty.")
        if len(username) > 80:
            raise ValueError("username must be 80 characters or fewer.")
        if not email:
            raise ValueError("email must not be empty.")
        if len(email) > 120:
            raise ValueError("email must be 120 characters or fewer.")

        user = User(
            username=username,
            email=email,
            full_name=full_name,
            is_active=is_active,
        )

        try:
            db.session.add(user)
            db.session.commit()
            return user
        except IntegrityError as exc:
            db.session.rollback()
            raise ValueError(
                f"A user with that username or email already exists. Detail: {exc.orig}"
            ) from exc
        except SQLAlchemyError as exc:
            db.session.rollback()
            raise RuntimeError(f"Database error while creating user: {exc}") from exc

    # ------------------------------------------------------------------
    # Read — single record
    # ------------------------------------------------------------------
    def get_by_id(self, user_id: int) -> Optional[User]:
        """Return the ``User`` with *user_id*, or ``None`` if not found."""
        if not isinstance(user_id, int) or user_id < 1:
            raise ValueError("user_id must be a positive integer.")
        return db.session.get(User, user_id)

    def get_by_username(self, username: str) -> Optional[User]:
        """Return the ``User`` whose username matches, or ``None``."""
        username = username.strip()
        if not username:
            raise ValueError("username must not be empty.")
        return db.session.execute(
            db.select(User).where(User.username == username)
        ).scalar_one_or_none()

    def get_by_email(self, email: str) -> Optional[User]:
        """Return the ``User`` whose email matches (case-insensitive), or ``None``."""
        email = email.strip().lower()
        if not email:
            raise ValueError("email must not be empty.")
        return db.session.execute(
            db.select(User).where(User.email == email)
        ).scalar_one_or_none()

    # ------------------------------------------------------------------
    # Read — collections
    # ------------------------------------------------------------------
    def get_all(self, active_only: bool = False) -> list[User]:
        """
        Return all users, optionally filtered to active accounts only.

        Parameters
        ----------
        active_only:  When ``True`` only rows where ``is_active=True`` are
                      returned (default ``False``).
        """
        query = db.select(User).order_by(User.id)
        if active_only:
            query = query.where(User.is_active.is_(True))
        return list(db.session.execute(query).scalars())

    def paginate(
        self,
        page: int = 1,
        per_page: int = 20,
        active_only: bool = False,
    ) -> dict:
        """
        Return a page of users together with pagination metadata.

        Returns
        -------
        A dict with keys:
            ``items``       – list of ``User`` objects for this page
            ``page``        – current page number (1-based)
            ``per_page``    – page size requested
            ``total``       – total number of matching rows
            ``pages``       – total number of pages
            ``has_prev``    – bool
            ``has_next``    – bool
        """
        if page < 1:
            raise ValueError("page must be >= 1.")
        if per_page < 1 or per_page > 200:
            raise ValueError("per_page must be between 1 and 200.")

        query = db.select(User).order_by(User.id)
        if active_only:
            query = query.where(User.is_active.is_(True))

        pagination = db.paginate(query, page=page, per_page=per_page, error_out=False)
        return {
            "items": pagination.items,
            "page": pagination.page,
            "per_page": pagination.per_page,
            "total": pagination.total,
            "pages": pagination.pages,
            "has_prev": pagination.has_prev,
            "has_next": pagination.has_next,
        }

    # ------------------------------------------------------------------
    # Update
    # ------------------------------------------------------------------
    def update(self, user_id: int, **fields) -> User:
        """
        Apply *fields* to the user identified by *user_id*.

        Accepted keyword arguments
        --------------------------
        username    (str)
        email       (str)
        full_name   (str | None)
        is_active   (bool)

        Returns
        -------
        The updated and committed ``User`` instance.

        Raises
        ------
        ValueError:     If the user is not found, a field value is invalid,
                        or a unique constraint would be violated.
        RuntimeError:   On unexpected database errors.
        """
        user = self.get_by_id(user_id)
        if user is None:
            raise ValueError(f"No user found with id={user_id}.")

        allowed = {"username", "email", "full_name", "is_active"}
        unknown = set(fields) - allowed
        if unknown:
            raise ValueError(f"Unknown field(s): {', '.join(sorted(unknown))}.")

        if "username" in fields:
            username = fields["username"].strip()
            if not username:
                raise ValueError("username must not be empty.")
            if len(username) > 80:
                raise ValueError("username must be 80 characters or fewer.")
            user.username = username

        if "email" in fields:
            email = fields["email"].strip().lower()
            if not email:
                raise ValueError("email must not be empty.")
            if len(email) > 120:
                raise ValueError("email must be 120 characters or fewer.")
            user.email = email

        if "full_name" in fields:
            user.full_name = fields["full_name"]

        if "is_active" in fields:
            if not isinstance(fields["is_active"], bool):
                raise ValueError("is_active must be a boolean.")
            user.is_active = fields["is_active"]

        try:
            db.session.commit()
            return user
        except IntegrityError as exc:
            db.session.rollback()
            raise ValueError(
                f"Update violates a unique constraint. Detail: {exc.orig}"
            ) from exc
        except SQLAlchemyError as exc:
            db.session.rollback()
            raise RuntimeError(f"Database error while updating user: {exc}") from exc

    # ------------------------------------------------------------------
    # Delete
    # ------------------------------------------------------------------
    def delete(self, user_id: int) -> bool:
        """
        Permanently delete the user with *user_id*.

        Returns
        -------
        ``True`` if the record was deleted, ``False`` if it did not exist.

        Raises
        ------
        ValueError:   If *user_id* is invalid.
        RuntimeError: On unexpected database errors.
        """
        user = self.get_by_id(user_id)
        if user is None:
            return False

        try:
            db.session.delete(user)
            db.session.commit()
            return True
        except SQLAlchemyError as exc:
            db.session.rollback()
            raise RuntimeError(f"Database error while deleting user: {exc}") from exc

    def deactivate(self, user_id: int) -> User:
        """
        Soft-delete: set ``is_active=False`` without removing the row.

        Returns
        -------
        The updated ``User`` instance.
        """
        return self.update(user_id, is_active=False)
