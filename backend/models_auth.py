# backend/models_auth.py
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, select
from passlib.context import CryptContext

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(p: str) -> str:
    return pwd_ctx.hash(p)

def verify_password(p: str, h: str) -> bool:
    return pwd_ctx.verify(p, h)

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    username: Optional[str] = None
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
