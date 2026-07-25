from __future__ import annotations

from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

db_url = settings.database_url
connect_args = {}
if "sqlite" in db_url:
    connect_args = {"check_same_thread": False}
    engine = create_engine(db_url, connect_args=connect_args)
else:
    try:
        engine = create_engine(db_url, pool_pre_ping=True)
    except Exception:
        fallback_db = Path(__file__).resolve().parents[2] / "gimpa_thesis.db"
        engine = create_engine(f"sqlite:///{fallback_db}", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
