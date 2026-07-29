from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.refresh_token import RefreshToken


def create_refresh_token_record(
    db: Session,
    user_id: int,
    jti: str,
    expires_at: datetime,
) -> RefreshToken:
    record = RefreshToken(user_id=user_id, token_jti=jti, expires_at=expires_at, revoked=False)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_refresh_token(db: Session, jti: str) -> RefreshToken | None:
    return db.query(RefreshToken).filter(RefreshToken.token_jti == jti).first()


def revoke_refresh_token(db: Session, record: RefreshToken) -> RefreshToken:
    record.revoked = True
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def is_refresh_token_valid(record: RefreshToken) -> bool:
    if record.revoked:
        return False
    expires_at = record.expires_at
    if expires_at is None:
        return False
    if expires_at.tzinfo is None:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
    else:
        now = datetime.now(timezone.utc)
    return expires_at > now

