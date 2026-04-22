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