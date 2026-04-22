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