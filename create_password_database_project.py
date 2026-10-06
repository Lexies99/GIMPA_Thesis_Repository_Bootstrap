import os
import sys
import subprocess

BASE_DIR = os.path.abspath(r"D:\NSS\Password_database")

files = {}

# .gitignore
files[".gitignore"] = """
__pycache__/
*.py[cod]
*$py.class
*.so
.env
.venv/
env/
venv/
ENV/
*.db
*.sqlite3
.pytest_cache/
.coverage
htmlcov/
dist/
build/
*.egg-info/
.DS_Store
.idea/
.vscode/
"""

# requirements.txt
files["requirements.txt"] = """fastapi>=0.110.0
uvicorn[standard]>=0.28.0
pydantic>=2.6.0
pydantic-settings>=2.2.0
sqlalchemy>=2.0.28
passlib[argon2,bcrypt]>=1.7.4
bcrypt>=4.1.2
argon2-cffi>=23.1.0
python-jose[cryptography]>=3.3.0
python-multipart>=0.0.9
httpx>=0.27.0
pytest>=8.0.0
python-dotenv>=1.0.1
"""

# .env.example
files[".env.example"] = """# Password_database Central IdP Service Configuration
APP_NAME=Password_Database_Central_IdP
APP_ENV=production
DEBUG=false
HOST=0.0.0.0
PORT=8020

# Secret key used for signing JWT tokens and HMAC signatures (Generate with `openssl rand -hex 32`)
SECRET_KEY=replace-with-a-secure-random-secret-key-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=30

# Database Connection (SQLite or PostgreSQL)
# SQLite: sqlite:///./password_database.db
# PostgreSQL: postgresql+psycopg2://user:password@localhost:5432/password_db
DATABASE_URL=sqlite:///./password_database.db

# Master API Key for Administrative Service-to-Service operations
MASTER_API_KEY=gimpa-master-auth-key-change-me-in-production

# Allowed CORS Origins (Comma separated)
CORS_ORIGINS=https://thesis.manamatechnologies.com,https://libraryapp.manamatechnologies.com,http://localhost:3000,http://localhost:5173
"""

# Dockerfile
files["Dockerfile"] = """FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \\
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \\
    build-essential \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8020

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8020"]
"""

# docker-compose.yml
files["docker-compose.yml"] = """version: '3.8'

services:
  password-database:
    build: .
    container_name: password_database_idp
    restart: always
    ports:
      - "8020:8020"
    environment:
      - APP_NAME=Password_Database_Central_IdP
      - APP_ENV=production
      - DATABASE_URL=sqlite:////data/password_database.db
      - SECRET_KEY=generate_production_random_secret_key_here
      - MASTER_API_KEY=gimpa_master_secure_service_key
      - CORS_ORIGINS=https://thesis.manamatechnologies.com,https://libraryapp.manamatechnologies.com
    volumes:
      - password_db_data:/data

volumes:
  password_db_data:
"""

# app/__init__.py
files["app/__init__.py"] = '"""Password_database Central Identity & Authentication Service."""\n__version__ = "1.0.0"\n'

# app/config.py
files["app/config.py"] = """import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Password_database Central IdP"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "production"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8020

    SECRET_KEY: str = "central-identity-super-secret-key-change-in-prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    DATABASE_URL: str = "sqlite:///./password_database.db"
    MASTER_API_KEY: str = "master-internal-auth-key-2026"
    CORS_ORIGINS: str = "https://thesis.manamatechnologies.com,https://libraryapp.manamatechnologies.com,http://localhost:3000,http://localhost:5173"

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
"""

# app/database.py
files["app/database.py"] = """from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False, "timeout": 30.0}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
"""

# app/models/__init__.py
files["app/models/__init__.py"] = """from app.database import Base
from app.models.user import User
from app.models.client_app import ClientApp
from app.models.audit_log import AuditLog

__all__ = ["Base", "User", "ClientApp", "AuditLog"]
"""

# app/models/user.py
files["app/models/user.py"] = """from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    
    # Institution / Profile Info
    student_id = Column(String(100), nullable=True)
    staff_id = Column(String(100), nullable=True)
    department = Column(String(150), nullable=True)
    school = Column(String(150), nullable=True)
    
    # Primary & Secondary Roles
    role = Column(String(50), default="student", nullable=False)       # Primary Role (e.g., student, lecturer, hod, dean, admin)
    roles = Column(Text, default="[]", nullable=False)                # JSON string array of all granted roles
    is_admin = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    
    # Security metadata
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
    last_login_at = Column(DateTime, nullable=True)
    last_password_change_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<User id={self.id} email={self.email} role={self.role}>"
"""

# app/models/client_app.py
files["app/models/client_app.py"] = """from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from datetime import datetime
from app.database import Base

class ClientApp(Base):
    __tablename__ = "client_apps"

    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String(150), unique=True, nullable=False)  # e.g., "GIMPA Thesis Repository", "SOTSS Library App"
    client_id = Column(String(100), unique=True, index=True, nullable=False)
    api_key_hash = Column(String(255), nullable=False)
    app_url = Column(String(255), nullable=True)
    allowed_redirect_uris = Column(Text, default="[]", nullable=False) # JSON string of allowed URIs
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<ClientApp id={self.id} name={self.client_name}>"
"""

# app/models/audit_log.py
files["app/models/audit_log.py"] = """from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from datetime import datetime
from app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(100), nullable=False) # LOGIN_SUCCESS, LOGIN_FAILED, PASSWORD_SYNC, ROLE_CHANGE
    user_email = Column(String(255), nullable=True, index=True)
    client_app = Column(String(150), nullable=True)
    ip_address = Column(String(100), nullable=True)
    user_agent = Column(String(255), nullable=True)
    status = Column(String(50), default="SUCCESS", nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<AuditLog id={self.id} event={self.event_type} user={self.user_email}>"
"""

# app/core/security.py
files["app/core/security.py"] = """import json
import secrets
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from passlib.context import CryptContext
from jose import jwt, JWTError
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader
from app.config import settings

pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")
security_bearer = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

def hash_password(password: str) -> str:
    \"\"\"Hash a plain password securely using Argon2id / bcrypt.\"\"\"
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    \"\"\"Verify a plain password against the stored cryptographic hash.\"\"\"
    if not hashed_password or not plain_password:
        return False
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    \"\"\"Generate a signed JWT access token for cross-app SSO.\"\"\"
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    \"\"\"Decode and validate a signed JWT token.\"\"\"
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None

def verify_service_api_key(api_key: Optional[str]) -> bool:
    \"\"\"Verify service-to-service internal API calls.\"\"\"
    if not api_key:
        return False
    return secrets.compare_digest(api_key, settings.MASTER_API_KEY)
"""

# app/schemas/auth.py
files["app/schemas/auth.py"] = """from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class SsoVerifyRequest(BaseModel):
    email: EmailStr
    password: str
    client_app: Optional[str] = "unknown_client"
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class SsoVerifyResponse(BaseModel):
    valid: bool
    user_id: Optional[int] = None
    email: str
    full_name: Optional[str] = None
    role: Optional[str] = None
    roles: Optional[List[str]] = []
    is_admin: bool = False
    is_active: bool = True
    token: Optional[str] = None
    message: Optional[str] = None

class SsoSyncPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str = Field(..., min_length=6)
    old_password: Optional[str] = None
    client_app: Optional[str] = "unknown_client"

class SsoSyncPasswordResponse(BaseModel):
    success: bool
    email: str
    message: str
    updated_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Dict[str, Any]
"""

# app/schemas/user.py
files["app/schemas/user.py"] = """from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    student_id: Optional[str] = None
    staff_id: Optional[str] = None
    department: Optional[str] = None
    school: Optional[str] = None
    role: Optional[str] = "student"
    roles: Optional[List[str]] = []
    is_admin: Optional[bool] = False
    is_active: Optional[bool] = True

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    student_id: Optional[str] = None
    staff_id: Optional[str] = None
    department: Optional[str] = None
    school: Optional[str] = None
    role: Optional[str] = None
    roles: Optional[List[str]] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6)

class UserResponse(UserBase):
    id: int
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class RoleAssignmentRequest(BaseModel):
    email: EmailStr
    role_title: str
    is_secondary: bool = True
"""

# app/api/v1/auth.py
files["app/api/v1/auth.py"] = """import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.auth import (
    SsoVerifyRequest, SsoVerifyResponse,
    SsoSyncPasswordRequest, SsoSyncPasswordResponse,
    TokenResponse
)
from app.core.security import hash_password, verify_password, create_access_token, verify_service_api_key

router = APIRouter(prefix="/auth", tags=["Central Authentication & SSO"])

@router.post("/verify-credentials", response_model=SsoVerifyResponse)
def verify_credentials(
    req: SsoVerifyRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    \"\"\"
    Primary SSO Verification API.
    Client apps (Library, Thesis, etc.) query this endpoint to authenticate users with one unified password.
    \"\"\"
    email = req.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    client_ip = req.ip_address or (request.client.host if request.client else "unknown")
    user_agent = req.user_agent or request.headers.get("user-agent", "unknown")

    if not user:
        # Log failed attempt
        db.add(AuditLog(
            event_type="LOGIN_FAILED",
            user_email=email,
            client_app=req.client_app,
            ip_address=client_ip,
            user_agent=user_agent,
            status="FAILED",
            details="User not found in Password_database"
        ))
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials: User account does not exist."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Please contact administrator."
        )

    # Check password match
    if not verify_password(req.password, user.password_hash):
        user.failed_login_attempts += 1
        db.add(AuditLog(
            event_type="LOGIN_FAILED",
            user_email=email,
            client_app=req.client_app,
            ip_address=client_ip,
            user_agent=user_agent,
            status="FAILED",
            details="Incorrect password supplied"
        ))
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # Success! Parse secondary roles
    user_roles = []
    try:
        if user.roles:
            user_roles = json.loads(user.roles) if isinstance(user.roles, str) else list(user.roles)
    except Exception:
        user_roles = []

    # Reset failed attempts and update last login
    user.failed_login_attempts = 0
    user.last_login_at = datetime.utcnow()
    db.add(AuditLog(
        event_type="LOGIN_SUCCESS",
        user_email=email,
        client_app=req.client_app,
        ip_address=client_ip,
        user_agent=user_agent,
        status="SUCCESS",
        details=f"User authenticated successfully via client {req.client_app}"
    ))
    db.commit()

    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "name": user.full_name,
        "role": user.role,
        "roles": user_roles,
        "is_admin": user.is_admin,
        "client_app": req.client_app
    }
    jwt_token = create_access_token(token_data)

    return SsoVerifyResponse(
        valid=True,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        roles=user_roles,
        is_admin=user.is_admin or ("system_admin" in user_roles or "Admin" in user_roles),
        is_active=user.is_active,
        token=jwt_token,
        message="Credentials verified successfully"
    )

@router.post("/sync-password", response_model=SsoSyncPasswordResponse)
def sync_password(
    req: SsoSyncPasswordRequest,
    x_api_key: str = Header(None, alias="X-API-Key"),
    db: Session = Depends(get_db)
):
    \"\"\"
    Update or synchronize a user's single password in the central database.
    Instantly propagates across all connected applications.
    \"\"\"
    email = req.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {email} not found in central database."
        )

    # If an old password is provided and no administrative master key is supplied, verify old password
    is_service_override = verify_service_api_key(x_api_key)
    if not is_service_override and req.old_password:
        if not verify_password(req.old_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password verification failed."
            )

    user.password_hash = hash_password(req.new_password)
    user.last_password_change_at = datetime.utcnow()
    user.updated_at = datetime.utcnow()

    db.add(AuditLog(
        event_type="PASSWORD_SYNC",
        user_email=email,
        client_app=req.client_app,
        status="SUCCESS",
        details="Password successfully changed and synced centrally"
    ))
    db.commit()

    return SsoSyncPasswordResponse(
        success=True,
        email=user.email,
        message="Central password updated successfully. Changes are active across all apps.",
        updated_at=user.last_password_change_at
    )
"""

# app/api/v1/users.py
files["app/api/v1/users.py"] = """import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.user import UserCreate, UserUpdate, UserResponse, RoleAssignmentRequest
from app.core.security import hash_password, verify_service_api_key

router = APIRouter(prefix="/users", tags=["Central User Management"])

def _format_user_roles(roles_field) -> List[str]:
    if not roles_field:
        return []
    if isinstance(roles_field, list):
        return roles_field
    try:
        return json.loads(roles_field)
    except Exception:
        return [r.strip() for r in str(roles_field).split(",") if r.strip()]

@router.get("", response_model=List[UserResponse])
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    role: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if search:
        s = f"%{search}%"
        query = query.filter((User.email.ilike(s)) | (User.full_name.ilike(s)))
    
    users = query.offset(skip).limit(limit).all()
    results = []
    for u in users:
        results.append(UserResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            student_id=u.student_id,
            staff_id=u.staff_id,
            department=u.department,
            school=u.school,
            role=u.role,
            roles=_format_user_roles(u.roles),
            is_admin=u.is_admin,
            is_active=u.is_active,
            is_verified=u.is_verified,
            created_at=u.created_at,
            updated_at=u.updated_at
        ))
    return results

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    req: UserCreate,
    db: Session = Depends(get_db)
):
    email = req.email.strip().lower()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User with email {email} already exists."
        )

    roles_json = json.dumps(req.roles or [])
    new_user = User(
        email=email,
        password_hash=hash_password(req.password),
        full_name=req.full_name,
        student_id=req.student_id,
        staff_id=req.staff_id,
        department=req.department,
        school=req.school,
        role=req.role or "student",
        roles=roles_json,
        is_admin=req.is_admin or False,
        is_active=req.is_active if req.is_active is not None else True,
        is_verified=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return UserResponse(
        id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        student_id=new_user.student_id,
        staff_id=new_user.staff_id,
        department=new_user.department,
        school=new_user.school,
        role=new_user.role,
        roles=_format_user_roles(new_user.roles),
        is_admin=new_user.is_admin,
        is_active=new_user.is_active,
        is_verified=new_user.is_verified,
        created_at=new_user.created_at,
        updated_at=new_user.updated_at
    )

@router.get("/{email}", response_model=UserResponse)
def get_user_by_email(email: str, db: Session = Depends(get_db)):
    clean_email = email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        student_id=user.student_id,
        staff_id=user.staff_id,
        department=user.department,
        school=user.school,
        role=user.role,
        roles=_format_user_roles(user.roles),
        is_admin=user.is_admin,
        is_active=user.is_active,
        is_verified=user.is_verified,
        created_at=user.created_at,
        updated_at=user.updated_at
    )

@router.post("/assign-role")
def assign_role(
    req: RoleAssignmentRequest,
    x_api_key: str = Header(None, alias="X-API-Key"),
    db: Session = Depends(get_db)
):
    \"\"\"Assign primary or secondary roles to a user centrally.\"\"\"
    email = req.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    current_roles = _format_user_roles(user.roles)
    clean_role = req.role_title.strip()

    if req.is_secondary:
        if clean_role not in current_roles:
            current_roles.append(clean_role)
    else:
        user.role = clean_role
        if clean_role not in current_roles:
            current_roles.append(clean_role)

    if clean_role.lower() in ["admin", "system_admin", "administrator"]:
        user.is_admin = True

    user.roles = json.dumps(current_roles)
    db.commit()

    return {
        "success": True,
        "email": user.email,
        "primary_role": user.role,
        "roles": current_roles,
        "is_admin": user.is_admin
    }
"""

# app/api/v1/health.py
files["app/api/v1/health.py"] = """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.config import settings

router = APIRouter(prefix="/health", tags=["System Health & Diagnostics"])

@router.get("")
def health_check(db: Session = Depends(get_db)):
    db_status = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy" if db_status == "ok" else "degraded",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database": db_status
    }
"""

# app/api/router.py
files["app/api/router.py"] = """from fastapi import APIRouter
from app.api.v1 import auth, users, health

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(health.router)
"""

# app/main.py
files["app/main.py"] = """from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.api.router import api_router

# Create database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=\"\"\"
    ## Central Identity Provider & Single Sign-On (SSO) API
    
    This service serves as the single source of truth for user authentication across all GIMPA web applications:
    * **GIMPA Thesis Repository** (`https://thesis.manamatechnologies.com`)
    * **SOTSS Library Application** (`https://libraryapp.manamatechnologies.com`)
    * Any future integrated institutional portals.
    
    ### Key Features:
    - **One Unified Password:** Secure Argon2id & Bcrypt cryptographic password verification.
    - **Instant Cross-App Sync:** Password updates and role changes propagate immediately.
    - **Secondary & Multi-Role Support:** Preserve primary academic titles while granting administrative privileges.
    - **Comprehensive Security Audit Logs:** Track all login attempts, failures, and credential events.
    \"\"\",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.get("/")
def root():
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs_url": "/docs",
        "sso_verify_endpoint": "/api/v1/auth/verify-credentials"
    }
"""

# scripts/seed_initial_users.py
files["scripts/seed_initial_users.py"] = """import sys
import os
import json
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.core.security import hash_password

Base.metadata.create_all(bind=engine)

def seed_users():
    db = SessionLocal()
    try:
        sample_users = [
            {
                "email": "admin@gimpa.edu.gh",
                "password": "Password123!",
                "full_name": "System Administrator",
                "role": "admin",
                "roles": ["system_admin", "librarian"],
                "is_admin": True,
                "school": "School of Technology and Social Sciences",
                "department": "Computer Science"
            },
            {
                "email": "dean@gimpa.edu.gh",
                "password": "Password123!",
                "full_name": "Dr. Dean",
                "role": "dean",
                "roles": ["dean", "lecturer"],
                "is_admin": False,
                "school": "School of Technology and Social Sciences",
                "department": "Computer Science"
            },
            {
                "email": "hod@gimpa.edu.gh",
                "password": "Password123!",
                "full_name": "Dr. HOD",
                "role": "hod",
                "roles": ["hod", "lecturer"],
                "is_admin": False,
                "school": "School of Technology and Social Sciences",
                "department": "Computer Science"
            },
            {
                "email": "lecturer@gimpa.edu.gh",
                "password": "Password123!",
                "full_name": "Prof. Lecturer",
                "role": "lecturer",
                "roles": ["lecturer"],
                "is_admin": False,
                "school": "School of Technology and Social Sciences",
                "department": "Computer Science"
            },
            {
                "email": "student@st.gimpa.edu.gh",
                "password": "Password123!",
                "full_name": "Student Scholar",
                "role": "student",
                "roles": ["student"],
                "is_admin": False,
                "student_id": "ST-2026-001",
                "school": "School of Technology and Social Sciences",
                "department": "Computer Science"
            }
        ]

        for u_data in sample_users:
            existing = db.query(User).filter(User.email == u_data["email"]).first()
            if not existing:
                u = User(
                    email=u_data["email"],
                    password_hash=hash_password(u_data["password"]),
                    full_name=u_data["full_name"],
                    role=u_data["role"],
                    roles=json.dumps(u_data["roles"]),
                    is_admin=u_data["is_admin"],
                    school=u_data.get("school"),
                    department=u_data.get("department"),
                    student_id=u_data.get("student_id"),
                    is_active=True,
                    is_verified=True
                )
                db.add(u)
                print(f"[+] Seeded user: {u_data['email']} (Role: {u_data['role']})")
            else:
                print(f"[*] User {u_data['email']} already exists.")

        db.commit()
        print("[SUCCESS] Seeding completed successfully.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_users()
"""

# scripts/run_server.py
files["scripts/run_server.py"] = """import uvicorn
import os
import sys

if __name__ == "__main__":
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
    uvicorn.run("app.main:app", host="0.0.0.0", port=8020, reload=True)
"""

# tests/test_auth_api.py
files["tests/test_auth_api.py"] = """from fastapi.testclient import TestClient
from app.main import app
from app.core.security import hash_password, verify_password

client = TestClient(app)

def test_health():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_password_hashing():
    pwd = "MySecretPassword123!"
    h = hash_password(pwd)
    assert verify_password(pwd, h) is True
    assert verify_password("WrongPassword", h) is False
"""

# README.md
files["README.md"] = """# Password_database

### Central Identity Provider & Single Sign-On (SSO) Microservice for Multi-Application Ecosystems

`Password_database` is an independent, centralized authentication and identity management service. It guarantees that users across multiple web applications (e.g. **GIMPA Thesis Repository** and **SOTSS Library Application**) use a single unified password with instantaneous synchronization, role-based access control, and complete audit logging.

---

## 🏗 System Architecture

```
                                  [ User Browser ]
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
      ┌─────────────────────────┐                 ┌─────────────────────────┐
      │   Thesis Repository     │                 │   SOTSS Library App     │
      │ thesis.manamatech...    │                 │ libraryapp.manamatech...│
      └────────────┬────────────┘                 └────────────┬────────────┘
                   │                                           │
                   │   POST /api/v1/auth/verify-credentials    │
                   └─────────────────────┬─────────────────────┘
                                         ▼
                   ┌───────────────────────────────────────────┐
                   │            Password_database              │
                   │      (Central Identity Provider IdP)      │
                   │                                           │
                   │  - Argon2id / Bcrypt Cryptographic Hash   │
                   │  - Single Source of Truth for Passwords   │
                   │  - Instant Multi-App Synchronization      │
                   │  - Comprehensive Security Audit Logs      │
                   │  - Primary + Secondary Role Management    │
                   └───────────────────────────────────────────┘
```

---

## 🚀 Key Features

1. **One Password Everywhere:** Users maintain a single password across all connected services without manual cross-database duplication.
2. **Instant Password Propagation:** Updating a password in any connected app or admin panel immediately takes effect everywhere.
3. **Advanced Role Management:** Supports both Primary Roles (e.g., Lecturer, Dean, HOD, Student) and Secondary Additional Roles (e.g., System Administrator, Department Editor).
4. **Security Audit Logging:** Tracks all authentication attempts (successful/failed), IP addresses, client applications, and credential modifications.
5. **OpenAPI / Swagger Documentation:** Interactive API explorer available at `/docs`.

---

## 📡 API Endpoints

### 1. Central Authentication & SSO
* `POST /api/v1/auth/verify-credentials`
  * **Payload:** `{"email": "user@gimpa.edu.gh", "password": "Password123!", "client_app": "library_app"}`
  * **Response:** Returns verification status, user details, role matrix, and signed JWT token.
* `POST /api/v1/auth/sync-password`
  * **Payload:** `{"email": "user@gimpa.edu.gh", "new_password": "NewPassword123!", "old_password": "OldPassword123!"}`
  * Updates password centrally and logs the audit event.

### 2. User & Role Management
* `GET /api/v1/users` - List users with filtering by role and search query.
* `POST /api/v1/users` - Create / provision a new user account.
* `GET /api/v1/users/{email}` - Retrieve user profile and role matrix.
* `POST /api/v1/users/assign-role` - Assign primary or secondary roles.

### 3. Diagnostics & Health
* `GET /api/v1/health` - Check service and database connectivity.
* `GET /docs` - Interactive OpenAPI Swagger UI.

---

## 🛠 Quick Start

### 1. Clone & Setup
```bash
git clone https://github.com/Lexies99/Password_database.git
cd Password_database
python -m venv venv
# Windows:
venv\\Scripts\\activate
# Linux/macOS:
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your desired database connection and secret keys
```

### 3. Seed Initial Accounts & Run
```bash
python scripts/seed_initial_users.py
python scripts/run_server.py
```
Open **http://localhost:8020/docs** in your browser.

---

## 🐳 Docker Deployment

```bash
docker-compose up -d --build
```

---

## 📄 License
MIT License. Developed for GIMPA Institutional Systems.
"""

# LICENSE
files["LICENSE"] = """MIT License

Copyright (c) 2026 Lexies99

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"""

for rel_path, content in files.items():
    full_path = os.path.join(BASE_DIR, rel_path.replace("/", os.sep))
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\\n")
    print(f"[CREATED] {rel_path}")

print("\\n[+] Initializing Git Repository...")
try:
    subprocess.run(["git", "init"], cwd=BASE_DIR, check=True)
    subprocess.run(["git", "add", "."], cwd=BASE_DIR, check=True)
    subprocess.run(["git", "commit", "-m", "feat: Initial commit of Password_database Central IdP and SSO microservice"], cwd=BASE_DIR, check=True)
    print("[+] Git repository initialized and initial commit created successfully!")
except Exception as e:
    print(f"[-] Git error: {e}")
