from __future__ import annotations

from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    must_change_password: bool = False


class RefreshToken(BaseModel):
    refresh_token: str


class SsoVerifyRequest(BaseModel):
    identifier: str
    password: str
    app_id: str | None = "libraryapp"
    api_key: str | None = None


class SsoVerifyResponse(BaseModel):
    authenticated: bool
    message: str
    user: dict | None = None
    access_token: str | None = None


class SsoSyncPasswordRequest(BaseModel):
    email: str
    old_password: str | None = None
    new_password: str
    api_key: str | None = None

