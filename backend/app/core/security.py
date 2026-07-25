from __future__ import annotations

from datetime import datetime, timedelta, timezone
import re
from uuid import uuid4
from typing import Any, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
PASSWORD_POLICY_REGEX = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{12,128}$"
)


def validate_password_requirements(password: str) -> None:
    value = (password or "").strip()
    if not PASSWORD_POLICY_REGEX.match(value):
        raise ValueError(
            "Password must be 12-128 characters and include uppercase, lowercase, number, and special character"
        )


def hash_password(password: str) -> str:
    validate_password_requirements(password)
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str, expires_minutes: Optional[int] = None) -> str:
    expire_minutes = expires_minutes or settings.access_token_expire_minutes
    expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    to_encode: dict[str, Any] = {"sub": subject, "exp": expire, "type": "access"}
    return jwt.encode(to_encode, settings.secret_key, algorithm="HS256")


def create_refresh_token(subject: str, expires_days: Optional[int] = None) -> tuple[str, str, datetime]:
    expire_days = expires_days or settings.refresh_token_expire_days
    expire = datetime.now(timezone.utc) + timedelta(days=expire_days)
    jti = uuid4().hex
    to_encode: dict[str, Any] = {"sub": subject, "exp": expire, "type": "refresh", "jti": jti}
    token = jwt.encode(to_encode, settings.secret_key, algorithm="HS256")
    return token, jti, expire


def decode_access_token(token: str, expected_type: str | None = "access") -> dict[str, Any] | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        if expected_type and payload.get("type") != expected_type:
            return None
        return payload
    except JWTError:
        return None
