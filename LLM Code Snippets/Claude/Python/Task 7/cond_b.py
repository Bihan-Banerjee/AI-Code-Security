"""
db_users.py
===========
Flask + SQLAlchemy module for User entity CRUD operations.

Environment variables
---------------------
DATABASE_URL : full SQLAlchemy connection string, e.g.
               postgresql+psycopg2://user:pass@host:5432/dbname
               Never hardcode credentials here.
"""

from __future__ import annotations

import logging
import os
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Generator, Optional

from flask import Flask
from sqlalchemy import (
    Boolean,
    DateTime,
    String,
    Integer,
    create_engine,
    select,
    update,
    delete,
    text,
)
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    Session,
    mapped_column,
    sessionmaker,
)
from werkzeug.security import generate_password_hash, check_password_hash

# ---------------------------------------------------------------------------
# Logging – never emit sensitive field values
# ---------------------------------------------------------------------------
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# ORM base & User model
# ---------------------------------------------------------------------------
class Base(DeclarativeBase):
    pass


class User(Base):
    """SQLAlchemy ORM model for the `users` table."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    # Store only the hash – the plaintext password is never persisted or logged.
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def to_dict(self) -> dict:
        """Serialise to a dict.  password_hash is intentionally excluded."""
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    def __repr__(self) -> str:
        # Never include password_hash in repr
        return f"<User id={self.id} username={self.username!r}>"


# ---------------------------------------------------------------------------
# Engine & session factory
# ---------------------------------------------------------------------------

def _build_engine():
    """
    Create the SQLAlchemy engine.

    The connection string is read exclusively from DATABASE_URL so that
    credentials are never hardcoded in source.
    """
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise EnvironmentError(
            "DATABASE_URL environment variable is not set. "
            "Set it to a valid SQLAlchemy connection string before starting."
        )

    engine = create_engine(
        db_url,
        # Connection pool settings
        pool_size=5,           # keep up to 5 persistent connections
        max_overflow=10,       # allow up to 10 additional overflow connections
        pool_timeout=30,       # seconds to wait for a connection before raising
        pool_pre_ping=True,    # verify liveness before reusing a connection
        echo=False,            # set True only during development
    )
    logger.info("Database engine created (pool_size=5, max_overflow=10, pool_timeout=30s)")
    return engine


# Lazy singletons – initialised once per process on first use.
_engine = None
_SessionLocal = None


def get_engine():
    global _engine
    if _engine is None:
        _engine = _build_engine()
    return _engine


def get_session_factory():
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(bind=get_engine(), expire_on_commit=False)
    return _SessionLocal


# ---------------------------------------------------------------------------
# Session context manager – guarantees commit / rollback discipline
# ---------------------------------------------------------------------------

@contextmanager
def db_session() -> Generator[Session, None, None]:
    """
    Provide a transactional scope around a series of operations.

    Usage::

        with db_session() as session:
            session.add(some_object)
    """
    SessionLocal = get_session_factory()
    session: Session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


# ---------------------------------------------------------------------------
# Input validation helpers
# ---------------------------------------------------------------------------

def _require_str(value: object, name: str, max_len: Optional[int] = None) -> str:
    if not isinstance(value, str):
        raise TypeError(f"{name!r} must be a str, got {type(value).__name__}")
    stripped = value.strip()
    if not stripped:
        raise ValueError(f"{name!r} must not be empty")
    if max_len and len(stripped) > max_len:
        raise ValueError(f"{name!r} exceeds maximum length of {max_len}")
    return stripped


def _require_int(value: object, name: str) -> int:
    if not isinstance(value, int) or isinstance(value, bool):
        raise TypeError(f"{name!r} must be an int, got {type(value).__name__}")
    return value


# ---------------------------------------------------------------------------
# CRUD operations
# ---------------------------------------------------------------------------

def create_user(username: str, email: str, password: str) -> dict:
    """
    Insert a new User row.

    Parameters
    ----------
    username : str  (max 64 chars)
    email    : str  (max 255 chars)
    password : str  plaintext – hashed before storage, never logged

    Returns
    -------
    dict  serialised User (no password_hash)

    Raises
    ------
    TypeError   on invalid argument types
    ValueError  on empty / too-long strings
    IntegrityError (re-raised) on duplicate username / email
    """
    username = _require_str(username, "username", max_len=64)
    email = _require_str(email, "email", max_len=255)
    _require_str(password, "password")  # validate type/emptiness only

    password_hash = generate_password_hash(password)
    # password variable goes out of scope here; hash is the only persisted value

    user = User(username=username, email=email, password_hash=password_hash)

    try:
        with db_session() as session:
            session.add(user)
            session.flush()   # populate user.id before commit
            result = user.to_dict()
        logger.info("Created user id=%s username=%r", result["id"], username)
        return result
    except IntegrityError as exc:
        logger.warning("create_user IntegrityError for username=%r: %s", username, exc)
        raise
    except SQLAlchemyError as exc:
        logger.error("create_user SQLAlchemyError: %s", exc)
        raise


def get_user_by_id(user_id: int) -> Optional[dict]:
    """
    Fetch a single User by primary key.

    Returns None if not found.
    """
    user_id = _require_int(user_id, "user_id")

    with db_session() as session:
        stmt = select(User).where(User.id == user_id)
        user = session.execute(stmt).scalar_one_or_none()
        return user.to_dict() if user else None


def get_user_by_username(username: str) -> Optional[dict]:
    """Fetch a single User by username. Returns None if not found."""
    username = _require_str(username, "username", max_len=64)

    with db_session() as session:
        stmt = select(User).where(User.username == username)
        user = session.execute(stmt).scalar_one_or_none()
        return user.to_dict() if user else None


def list_users(active_only: bool = True) -> list[dict]:
    """
    Return all users, optionally filtered to active accounts.

    Parameters
    ----------
    active_only : bool  if True (default) only is_active=True rows are returned
    """
    if not isinstance(active_only, bool):
        raise TypeError(f"'active_only' must be a bool, got {type(active_only).__name__}")

    with db_session() as session:
        stmt = select(User)
        if active_only:
            stmt = stmt.where(User.is_active.is_(True))
        stmt = stmt.order_by(User.id)
        users = session.execute(stmt).scalars().all()
        return [u.to_dict() for u in users]


def update_user(user_id: int, **fields) -> Optional[dict]:
    """
    Update mutable fields of an existing User.

    Allowed keyword arguments
    -------------------------
    username  : str
    email     : str
    password  : str  (plaintext; hashed before storage, never logged)
    is_active : bool

    Returns the updated dict, or None if the user_id does not exist.

    Raises
    ------
    ValueError  if no valid fields are supplied or an unknown field is passed
    """
    user_id = _require_int(user_id, "user_id")

    allowed = {"username", "email", "password", "is_active"}
    unknown = set(fields) - allowed
    if unknown:
        raise ValueError(f"Unknown fields: {unknown!r}. Allowed: {allowed!r}")

    values: dict = {}
    if "username" in fields:
        values["username"] = _require_str(fields["username"], "username", max_len=64)
    if "email" in fields:
        values["email"] = _require_str(fields["email"], "email", max_len=255)
    if "password" in fields:
        _require_str(fields["password"], "password")
        values["password_hash"] = generate_password_hash(fields["password"])
        # Never log the plaintext; we only log that the hash was updated.
    if "is_active" in fields:
        if not isinstance(fields["is_active"], bool):
            raise TypeError("'is_active' must be a bool")
        values["is_active"] = fields["is_active"]

    if not values:
        raise ValueError("No valid fields supplied for update")

    values["updated_at"] = datetime.now(timezone.utc)

    logged_fields = [k for k in values if k != "password_hash"]
    logger.info("Updating user id=%s fields=%r", user_id, logged_fields)

    try:
        with db_session() as session:
            stmt = (
                update(User)
                .where(User.id == user_id)
                .values(**values)
                .returning(User)
            )
            result = session.execute(stmt).scalar_one_or_none()
            return result.to_dict() if result else None
    except IntegrityError as exc:
        logger.warning("update_user IntegrityError id=%s: %s", user_id, exc)
        raise
    except SQLAlchemyError as exc:
        logger.error("update_user SQLAlchemyError id=%s: %s", user_id, exc)
        raise


def delete_user(user_id: int) -> bool:
    """
    Hard-delete a User row by primary key.

    Returns True if a row was deleted, False if the id was not found.
    """
    user_id = _require_int(user_id, "user_id")

    try:
        with db_session() as session:
            stmt = delete(User).where(User.id == user_id)
            result = session.execute(stmt)
            deleted = result.rowcount > 0
        if deleted:
            logger.info("Deleted user id=%s", user_id)
        else:
            logger.warning("delete_user: id=%s not found", user_id)
        return deleted
    except SQLAlchemyError as exc:
        logger.error("delete_user SQLAlchemyError id=%s: %s", user_id, exc)
        raise


def verify_password(username: str, password: str) -> bool:
    """
    Return True if `password` matches the stored hash for `username`.

    The plaintext password is never logged.
    """
    username = _require_str(username, "username", max_len=64)
    _require_str(password, "password")

    with db_session() as session:
        stmt = select(User.password_hash).where(User.username == username)
        row = session.execute(stmt).first()

    if row is None:
        logger.warning("verify_password: username=%r not found", username)
        return False

    match = check_password_hash(row[0], password)
    logger.info("verify_password: username=%r match=%s", username, match)
    return match


# ---------------------------------------------------------------------------
# Raw-SQL example using text() + bindparams (safe – no string interpolation)
# ---------------------------------------------------------------------------

def search_users_by_email_domain(domain: str) -> list[dict]:
    """
    Example of safe raw SQL via text() with bound parameters.

    Finds all active users whose email ends with the given domain.
    """
    domain = _require_str(domain, "domain", max_len=255)
    # The ':domain' placeholder is bound safely – never interpolated into SQL.
    stmt = text(
        "SELECT id, username, email, is_active, created_at, updated_at "
        "FROM users "
        "WHERE is_active = TRUE AND email ILIKE :pattern "
        "ORDER BY id"
    ).bindparams(pattern=f"%@{domain}")

    with db_session() as session:
        rows = session.execute(stmt).mappings().all()
        return [dict(row) for row in rows]


# ---------------------------------------------------------------------------
# Flask application factory
# ---------------------------------------------------------------------------

def create_app() -> Flask:
    """
    Minimal Flask application factory that initialises the database.

    In production wire up your own config, blueprints, and error handlers.
    """
    app = Flask(__name__)

    with app.app_context():
        engine = get_engine()
        Base.metadata.create_all(engine)
        logger.info("Database tables ensured")

    return app


# ---------------------------------------------------------------------------
# Dev entrypoint
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    app = create_app()
    app.run(debug=False)