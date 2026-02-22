from typing import Optional, List, Dict, Tuple
from datetime import datetime
import json
import random
import hashlib
import os
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, Depends, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from sqlmodel import (
    SQLModel,
    Field,
    create_engine,
    Session,
    select,
)
from sqlalchemy import UniqueConstraint, func

# ============================================================
# MODELS / TABLES
# ============================================================

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    username: Optional[str] = None
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class LastWord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    movie_id: int = Field(foreign_key="movie.id", index=True)
    user_id: str = Field(index=True)
    text: str = Field(max_length=200)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class Movie(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tmdb_id: int = Field(index=True)
    slug: str = Field(index=True, unique=True)
    title: str
    year: Optional[int] = None
    overview: Optional[str] = None
    poster_path: Optional[str] = None
    # stored as JSON string '["Horror","Sci-Fi"]' or comma-separated string
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
    user_id: str = Field(index=True)
    panic: int
    splatter: int
    dread: int
    creature: int
    fun: int
    plot: int
    rewatch: int
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class Like(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("movie_id", "user_id", name="uq_like_user_movie"),)
    id: Optional[int] = Field(default=None, primary_key=True)
    movie_id: int = Field(foreign_key="movie.id", index=True)
    user_id: str = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class ScoreOut(SQLModel):
    counts: int
    averages: Dict[str, Optional[float]]
    consensus: Dict[str, Optional[str]]


# ============================================================
# DB ENGINE / SESSION HELPERS
# ============================================================

def _is_railway() -> bool:
    # Railway typically provides PORT, RAILWAY_* vars
    return bool(os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("PORT") or os.getenv("RAILWAY_PROJECT_ID"))

# Local default: put DB next to this file (works when running locally)
LOCAL_DEFAULT = str(Path(__file__).parent / "horror.db")

# Railway default: /tmp is writable (but NOT persistent across redeploys)
DEFAULT_SQLITE_PATH = "/tmp/horror.db" if _is_railway() else LOCAL_DEFAULT

SQLITE_PATH = os.getenv("SQLITE_PATH", DEFAULT_SQLITE_PATH)

# If you later add Railway Postgres, Railway will provide DATABASE_URL automatically.
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{SQLITE_PATH}")

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    # Ensure the parent directory exists (for non-/tmp custom paths)
    try:
        Path(SQLITE_PATH).parent.mkdir(parents=True, exist_ok=True)
    except Exception:
        # If this fails due to permissions, /tmp will still work
        pass
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args=connect_args,
)

def init_db() -> None:
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session


# ============================================================
# FASTAPI APP + CORS
# ============================================================

app = FastAPI(title="ScreamSheet API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# AUTH HELPERS
# ============================================================

def hash_password(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def verify_password(raw: str, hashed: str) -> bool:
    return hash_password(raw) == hashed


# ============================================================
# UTILS
# ============================================================

def parse_subgenres(raw: Optional[str]) -> List[str]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [str(x) for x in parsed]
        return [str(parsed)]
    except Exception:
        return [s.strip() for s in raw.split(",") if s.strip()]


def movie_to_card_dict(m: Movie) -> Dict:
    return {
        "slug": m.slug,
        "title": m.title,
        "year": m.year,
        "overview": m.overview,
        "posterUrl": m.poster_path,
        "subgenres": parse_subgenres(m.subgenres),
    }


def norm_slug(s: str) -> str:
    return (s or "").strip().lower()


def get_movie_by_slug(session: Session, raw_slug: str) -> Optional[Movie]:
    s = norm_slug(raw_slug)
    return session.exec(select(Movie).where(func.lower(Movie.slug) == s)).first()


# ============================================================
# AUTH ENDPOINTS
# ============================================================

class RegisterIn(BaseModel):
    email: str
    password: str
    username: Optional[str] = None


class RegisterOut(BaseModel):
    id: int
    email: str
    username: Optional[str] = None


@app.post("/auth/register", response_model=RegisterOut)
def register(body: RegisterIn, session: Session = Depends(get_session)):
    email_norm = body.email.strip().lower()
    if not email_norm or not body.password:
        raise HTTPException(status_code=400, detail="Email and password required")

    existing = session.exec(select(User).where(User.email == email_norm)).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    user = User(
        email=email_norm,
        username=(body.username or "").strip() or None,
        password_hash=hash_password(body.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    return RegisterOut(id=user.id, email=user.email, username=user.username)


class LoginIn(BaseModel):
    email: str
    password: str


class LoginOut(BaseModel):
    access_token: str
    token_type: str
    user_id: str  # in the app we use email as the "user_id"


@app.post("/auth/login", response_model=LoginOut)
def login(body: LoginIn, session: Session = Depends(get_session)):
    email_norm = body.email.strip().lower()
    user = session.exec(select(User).where(User.email == email_norm)).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = f"fake-{uuid4()}"
    # IMPORTANT: we return email as the identifier used on Ratings/Likes/etc.
    return LoginOut(
        access_token=token,
        token_type="bearer",
        user_id=user.email,
    )


# ============================================================
# MOVIES (LIST / RANDOM / DETAIL)
# ============================================================

@app.get("/movies")
def list_movies(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
):
    stmt = (
        select(Movie)
        .order_by(Movie.year.desc().nulls_last(), Movie.id.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = session.exec(stmt).all()
    movies_out = [movie_to_card_dict(m) for m in rows]
    return {
        "movies": movies_out,
        "count": len(movies_out),
        "limit": limit,
        "offset": offset,
    }


@app.get("/movies/random")
def random_movies(limit: int = 10, session: Session = Depends(get_session)):
    all_rows = session.exec(select(Movie)).all()
    if not all_rows:
        return {"results": []}
    sample = random.sample(all_rows, k=min(limit, len(all_rows)))
    out = [movie_to_card_dict(m) for m in sample]
    return {"results": out}


@app.get("/movies/{slug}")
def get_movie_detail(slug: str, session: Session = Depends(get_session)):
    movie = get_movie_by_slug(session, slug)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    words_rows = session.exec(
        select(LastWord)
        .where(LastWord.movie_id == movie.id)
        .order_by(LastWord.created_at.desc())
        .limit(10)
    ).all()
    last_words = [
        {
            "user_id": w.user_id,
            "text": w.text,
            "created_at": w.created_at.isoformat(),
        }
        for w in words_rows
    ]

    return {
        "slug": movie.slug,
        "title": movie.title,
        "year": movie.year,
        "overview": movie.overview,
        "posterUrl": movie.poster_path,
        "subgenres": parse_subgenres(movie.subgenres),
        "last_words": last_words,
    }


# ============================================================
# SCORES (COMMUNITY AGGREGATES)
# ============================================================

@app.get("/movies/{slug}/scores")
def get_scores(slug: str, session: Session = Depends(get_session)):
    mv = get_movie_by_slug(session, slug)
    if not mv:
        raise HTTPException(status_code=404, detail="Movie not found")

    rows = session.exec(select(Rating).where(Rating.movie_id == mv.id)).all()
    counts = len(rows)
    if counts == 0:
        return {
            "counts": 0,
            "averages": {k: None for k in METRICS},
            "consensus": {k: None for k in METRICS},
        }

    avgs = {
        k: round(sum(getattr(r, k) for r in rows) / counts, 2) for k in METRICS
    }

    def to_consensus(x: float | None) -> Optional[str]:
        if x is None:
            return None
        if x >= 4.5:
            return "Overkill"
        if x >= 3.5:
            return "High"
        if x >= 2.5:
            return "Moderate"
        if x >= 1.5:
            return "Low"
        return "Minimal"

    consensus = {k: to_consensus(avgs[k]) for k in METRICS}
    return {"counts": counts, "averages": avgs, "consensus": consensus}


# ============================================================
# RATINGS
# ============================================================

class RatingIn(BaseModel):
  user_id: str
  panic: int
  splatter: int
  dread: int
  creature: int
  fun: int
  plot: int
  rewatch: int


@app.post("/movies/{slug}/ratings")
def upsert_rating(slug: str, body: RatingIn, session: Session = Depends(get_session)):
    mv = get_movie_by_slug(session, slug)
    if not mv:
        raise HTTPException(status_code=404, detail="Movie not found")

    r = session.exec(
        select(Rating).where(
            (Rating.user_id == body.user_id) & (Rating.movie_id == mv.id)
        )
    ).first()

    fields = METRICS
    now = datetime.utcnow()
    if r:
        for k in fields:
            setattr(r, k, getattr(body, k))
        r.updated_at = now
        session.add(r)
    else:
        session.add(
            Rating(
                movie_id=mv.id,
                user_id=body.user_id,
                **{k: getattr(body, k) for k in fields},
            )
        )
    session.commit()
    return {"ok": True}


@app.get("/movies/{slug}/my-rating")
def get_my_rating(
    slug: str,
    user_id: str = Query(...),
    session: Session = Depends(get_session),
):
    mv = get_movie_by_slug(session, slug)
    if not mv:
        raise HTTPException(status_code=404, detail="Movie not found")

    r = session.exec(
        select(Rating).where(
            (Rating.user_id == user_id) & (Rating.movie_id == mv.id)
        )
    ).first()

    if not r:
        return {"exists": False}

    return {
        "exists": True,
        "panic": r.panic,
        "splatter": r.splatter,
        "dread": r.dread,
        "creature": r.creature,
        "fun": r.fun,
        "plot": r.plot,
        "rewatch": r.rewatch,
    }


# ============================================================
# LAST WORDS
# ============================================================

class LastWordIn(BaseModel):
    user_id: str
    text: str


@app.get("/movies/{slug}/lastwords")
def get_last_words(slug: str, session: Session = Depends(get_session)):
    mv = get_movie_by_slug(session, slug)
    if not mv:
        raise HTTPException(status_code=404, detail="Movie not found")
    rows = session.exec(
        select(LastWord)
        .where(LastWord.movie_id == mv.id)
        .order_by(LastWord.created_at.desc())
        .limit(10)
    ).all()
    return [
        {
            "user_id": r.user_id,
            "text": r.text,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]


@app.post("/movies/{slug}/last-word")
def upsert_last_word(
    slug: str, body: LastWordIn, session: Session = Depends(get_session)
):
    mv = get_movie_by_slug(session, slug)
    if not mv:
        raise HTTPException(status_code=404, detail="Movie not found")

    text_clean = (body.text or "").trim() if hasattr(body.text, "trim") else (body.text or "").strip()
    if not text_clean:
        raise HTTPException(status_code=400, detail="Empty last words")
    if len(text_clean) > 200:
        text_clean = text_clean[:200]

    existing = session.exec(
        select(LastWord).where(
            (LastWord.movie_id == mv.id) & (LastWord.user_id == body.user_id)
        )
    ).first()

    now = datetime.utcnow()
    if existing:
        existing.text = text_clean
        existing.created_at = now
        session.add(existing)
    else:
        session.add(
            LastWord(
                movie_id=mv.id,
                user_id=body.user_id,
                text=text_clean,
                created_at=now,
            )
        )
    session.commit()
    return {"ok": True}


# ============================================================
# USER LIBRARY (KILL / GRAVE)
# ============================================================

class LibraryUpdateIn(BaseModel):
    slug: str
    state: str  # "kill" or "grave"


@app.get("/users/{user_id}/library")
def get_library(user_id: str, session: Session = Depends(get_session)):
    def rows_for(state: str):
        q = (
            select(UserMovie, Movie)
            .where((UserMovie.user_id == user_id) & (UserMovie.state == state))
            .join(Movie, Movie.id == UserMovie.movie_id)
            .order_by(UserMovie.created_at.desc())
        )
        items = []
        for um, m in session.exec(q):
            items.append(
                {
                    "slug": m.slug,
                    "title": m.title,
                    "year": m.year,
                    "posterUrl": m.poster_path,
                    "subgenres": parse_subgenres(m.subgenres),
                }
            )
        return items

    return {"kill": rows_for("kill"), "grave": rows_for("grave")}


@app.post("/users/{user_id}/library")
def upsert_library(
    user_id: str, body: LibraryUpdateIn, session: Session = Depends(get_session)
):
    state = (body.state or "").lower()
    if state not in ("kill", "grave"):
        raise HTTPException(status_code=400, detail="state must be 'kill' or 'grave'")

    mv = get_movie_by_slug(session, body.slug)
    if not mv:
        raise HTTPException(status_code=404, detail="Movie not found")

    existing = session.exec(
        select(UserMovie).where(
            (UserMovie.user_id == user_id) & (UserMovie.movie_id == mv.id)
        )
    ).first()

    if existing:
        existing.state = state
        session.add(existing)
    else:
        session.add(UserMovie(user_id=user_id, movie_id=mv.id, state=state))

    session.commit()
    return {"ok": True}


class LibraryRemoveIn(BaseModel):
    slug: str


@app.delete("/users/{user_id}/library")
def remove_library(
    user_id: str, body: LibraryRemoveIn, session: Session = Depends(get_session)
):
    mv = get_movie_by_slug(session, body.slug)
    if not mv:
        raise HTTPException(status_code=404, detail="Movie not found")

    rows = session.exec(
        select(UserMovie).where(
            (UserMovie.user_id == user_id) & (UserMovie.movie_id == mv.id)
        )
    ).all()
    for r in rows:
        session.delete(r)
    session.commit()
    return {"ok": True, "removed": bool(rows)}


# ============================================================
# LIKES
# ============================================================

class LikeIn(BaseModel):
    user_id: str


class LikeStatusOut(BaseModel):
    liked: bool


@app.post("/movies/{slug}/like", response_model=LikeStatusOut)
def like_movie(slug: str, body: LikeIn, session: Session = Depends(get_session)):
    mv = get_movie_by_slug(session, slug)
    if not mv:
        raise HTTPException(status_code=404, detail="Movie not found")

    existing = session.exec(
        select(Like).where((Like.user_id == body.user_id) & (Like.movie_id == mv.id))
    ).first()
    if existing:
        return LikeStatusOut(liked=True)

    session.add(Like(movie_id=mv.id, user_id=body.user_id))
    session.commit()
    return LikeStatusOut(liked=True)


@app.delete("/movies/{slug}/like", response_model=LikeStatusOut)
def unlike_movie(
    slug: str,
    user_id: Optional[str] = Query(None),
    body: Optional[LikeIn] = Body(None),
    session: Session = Depends(get_session),
):
    mv = get_movie_by_slug(session, slug)
    if not mv:
        raise HTTPException(status_code=404, detail="Movie not found")

    uid = user_id or (body.user_id if body else None)
    if not uid:
        raise HTTPException(status_code=400, detail="user_id required")

    rows = session.exec(
        select(Like).where((Like.user_id == uid) & (Like.movie_id == mv.id))
    ).all()
    for r in rows:
        session.delete(r)
    session.commit()
    return LikeStatusOut(liked=False)


@app.get("/movies/{slug}/like-status", response_model=LikeStatusOut)
def like_status(
    slug: str,
    user_id: str = Query(...),
    session: Session = Depends(get_session),
):
    mv = get_movie_by_slug(session, slug)
    if not mv:
        raise HTTPException(status_code=404, detail="Movie not found")
    exists = session.exec(
        select(Like).where((Like.user_id == user_id) & (Like.movie_id == mv.id))
    ).first()
    return LikeStatusOut(liked=bool(exists))


# ============================================================
# FEAR FILE (LIKES-BASED TASTE PROFILE)
# ============================================================

@app.get("/users/{user_id}/fear-file")
def get_fear_file(user_id: str, session: Session = Depends(get_session)):
    # Get liked movies for this user
    like_rows: List[Tuple[Like, Movie]] = session.exec(
        select(Like, Movie)
        .join(Movie, Movie.id == Like.movie_id)
        .where(Like.user_id == user_id)
        .order_by(Like.created_at.desc())
    ).all()

    if not like_rows:
        raise HTTPException(
            status_code=404,
            detail="No liked movies yet. Like a few movies to build your Fear File.",
        )

    # For each liked movie, we build an "effective rating vector":
    # - If user has rated it -> use their rating
    # - Else if movie has community ratings -> use community averages
    # - Else -> skip the movie
    effective: List[Tuple[Dict[str, float], Movie]] = []

    for like_obj, mv in like_rows:
        # user's own rating for that movie
        r_user = session.exec(
            select(Rating).where(
                (Rating.user_id == user_id) & (Rating.movie_id == mv.id)
            )
        ).first()

        if r_user:
            vec = {m: float(getattr(r_user, m)) for m in METRICS}
            effective.append((vec, mv))
            continue

        # fallback to community averages for that movie
        all_r = session.exec(
            select(Rating).where(Rating.movie_id == mv.id)
        ).all()
        if not all_r:
            # no ratings at all for this movie, skip it
            continue

        vec = {}
        for m in METRICS:
            avg = sum(getattr(rr, m) for rr in all_r) / len(all_r)
            vec[m] = float(avg)
        effective.append((vec, mv))

    if not effective:
        raise HTTPException(
            status_code=404,
            detail="Not enough ratings on your liked movies to build a Fear File yet.",
        )

    # Aggregate over the effective vectors
    sum_map = {m: 0.0 for m in METRICS}
    count_map = {m: 0 for m in METRICS}
    for vec, _mv in effective:
        for m in METRICS:
            v = vec.get(m)
            if v is not None:
                sum_map[m] += v
                count_map[m] += 1

    avg_map = {
        m: round(sum_map[m] / count_map[m], 2) if count_map[m] else None
        for m in METRICS
    }

    def mini_list(sorted_pairs: List[Tuple[Dict[str, float], Movie]]):
        out = []
        for vec, mv in sorted_pairs[:3]:
            out.append(
                {
                    "title": mv.title,
                    "slug": mv.slug,
                    "year": mv.year,
                    "posterUrl": mv.poster_path,
                }
            )
        return out

    # Sort by metrics using the effective vectors
    top_creature = sorted(
        effective, key=lambda p: p[0].get("creature", 0.0), reverse=True
    )
    top_splatter = sorted(
        effective, key=lambda p: p[0].get("splatter", 0.0), reverse=True
    )
    comfort_rewatch = sorted(
        effective, key=lambda p: p[0].get("rewatch", 0.0), reverse=True
    )

    favorites = {
        "top_creature": mini_list(top_creature),
        "top_splatter": mini_list(top_splatter),
        "comfort_rewatch": mini_list(comfort_rewatch),
    }

    return {
        "totals": {"ratings_count": len(effective)},
        "averages": avg_map,
        "favorites": favorites,
    }


# ============================================================
# NIGHT OF FRIGHTS
# ============================================================

class NightReq(BaseModel):
    vibe: str
    blood: str
    intensity: str
    era: str
    user_id: Optional[str] = None


@app.post("/night-of-frights")
def night_of_frights(body: NightReq, session: Session = Depends(get_session)):
    era_min = era_max = None
    if body.era == "70s":
        era_min, era_max = 1970, 1979
    elif body.era == "80s":
        era_min, era_max = 1980, 1989
    elif body.era == "90s":
        era_min, era_max = 1990, 1999
    elif body.era == "modern":
        era_min, era_max = 2000, 2100

    stmt = select(Movie)
    if era_min is not None:
        stmt = stmt.where(Movie.year >= era_min)
    if era_max is not None:
        stmt = stmt.where(Movie.year <= era_max)
    all_candidates = session.exec(stmt).all()
    if not all_candidates:
        return {
            "opener": None,
            "main_event": None,
            "chaser": None,
            "blurb": "No matches in that era.",
        }

    def score_movie(m: Movie) -> float:
        score = 0.0
        subs = [s.lower() for s in parse_subgenres(m.subgenres)]
        v = body.vibe

        if v == "slashers":
            if "slasher" in subs or "killer" in subs:
                score += 3
        elif v == "creature-feature":
            if any(x in subs for x in ["creature", "monster", "alien"]):
                score += 3
        elif v == "paranormal":
            if any(
                x in subs
                for x in ["ghost", "haunted", "possession", "supernatural"]
            ):
                score += 3
        elif v == "psychological":
            if any(x in subs for x in ["psychological", "thriller"]):
                score += 3
        elif v == "party-horror":
            score += 1
        elif v == "slow-burn-doom":
            if any(x in subs for x in ["slow burn", "atmospheric"]):
                score += 3
        elif v == "found-footage":
            if any(x in subs for x in ["found footage", "mockumentary"]):
                score += 3
        elif v == "campy":
            if any(x in subs for x in ["comedy", "camp", "parody"]):
                score += 3
        elif v == "cult-classics":
            if any(x in subs for x in ["cult", "cult classic"]):
                score += 3
        elif v == "new-scares":
            if (m.year or 0) >= 2015:
                score += 3

        if body.blood == "high":
            if any(x in subs for x in ["gore", "gory", "splatter", "slasher"]):
                score += 2
        elif body.blood == "low":
            if any(
                x in subs
                for x in ["ghost", "haunted", "supernatural", "psychological"]
            ):
                score += 2

        if body.intensity == "relentless":
            if any(
                x in subs
                for x in [
                    "slasher",
                    "monster",
                    "creature",
                    "possession",
                    "demon",
                    "survival",
                ]
            ):
                score += 2
        elif body.intensity == "chill":
            if any(x in subs for x in ["comedy", "camp", "parody"]):
                score += 2

        score += random.random() * 0.5
        return score

    scored = sorted(all_candidates, key=lambda mv: score_movie(mv), reverse=True)
    if len(scored) == 1:
        chosen_main = chosen_opener = chosen_chaser = scored[0]
    elif len(scored) == 2:
        chosen_main, chosen_opener, chosen_chaser = scored[0], scored[1], scored[1]
    else:
        chosen_main = scored[0]
        opener_pool = scored[1:6]
        random.shuffle(opener_pool)
        chosen_opener = opener_pool[0]
        chaser_pool = scored[2:10]
        random.shuffle(chaser_pool)
        chosen_chaser = chaser_pool[0]

    def pack(m: Movie, role: str) -> dict:
        return {
            "slug": m.slug,
            "title": m.title,
            "year": m.year,
            "posterUrl": m.poster_path,
            "why": f"{role} pick for a {body.vibe} / {body.era} / {body.intensity} night.",
        }

    opener_dict = pack(chosen_opener, "Opener")
    main_dict = pack(chosen_main, "Main Event")
    chaser_dict = pack(chosen_chaser, "Chaser")
    blurb = (
        f"Tonight’s theme: {body.vibe.upper()}.\n\n"
        f"Start with {opener_dict['title']} ({opener_dict['year']}) to set the mood. "
        f"Then your Main Event is {main_dict['title']} ({main_dict['year']}). "
        f"Finally, stumble into {chaser_dict['title']} ({chaser_dict['year']}) as the chaser."
    )
    return {
        "opener": opener_dict,
        "main_event": main_dict,
        "chaser": chaser_dict,
        "blurb": blurb,
    }


# ============================================================
# SEARCH
# ============================================================

@app.get("/search")
def search_movies(q: str = Query(""), session: Session = Depends(get_session)):
    q_clean = q.strip().lower()
    if not q_clean:
        return {"results": []}
    stmt = (
        select(Movie)
        .where(
            (func.lower(Movie.title).like(f"%{q_clean}%"))
            | (func.lower(Movie.subgenres).like(f"%{q_clean}%"))
        )
        .limit(30)
    )
    rows = session.exec(stmt).all()
    out = [movie_to_card_dict(m) for m in rows]
    return {"results": out}


# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
def on_startup():
    init_db()
