from typing import Optional, Dict
from datetime import datetime
from sqlmodel import SQLModel, Field
from sqlalchemy import UniqueConstraint

class LastWord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    movie_id: int = Field(foreign_key="movie.id", index=True)
    user_id: str = Field(index=True)
    text: str = Field(max_length=200)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

class Movie(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tmdb_id: int  # NOT NULL in DB
    slug: str
    title: str
    year: Optional[int] = None
    overview: Optional[str] = None
    poster_path: Optional[str] = None
    subgenres: Optional[str] = None

class UserMovie(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("movie_id", "user_id", name="uq_user_movie"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    movie_id: int = Field(foreign_key="movie.id", index=True)
    user_id: str = Field(index=True)
    state: str = Field(index=True)  # "kill" or "grave"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    watched_at: Optional[datetime] = None

METRICS = ["panic", "splatter", "dread", "creature", "fun", "plot", "rewatch"]

class Rating(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    movie_id: int = Field(foreign_key="movie.id", index=True)
    user_id: str = Field(index=True)  # 🔑 who rated (device/user)

    panic: int
    splatter: int
    dread: int
    creature: int
    fun: int
    plot: int
    rewatch: int

    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow, index=True)

class ScoreOut(SQLModel):
    counts: int
    averages: Dict[str, Optional[float]]
    consensus: Dict[str, Optional[str]]
