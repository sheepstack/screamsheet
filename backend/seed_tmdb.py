import os
import json
import requests
from typing import List, Dict, Any, Tuple, Set
from datetime import datetime

from dotenv import load_dotenv
load_dotenv()  # pulls TMDB_API_KEY from backend/.env if present

from sqlmodel import select
from db import init_db, get_session
from models import Movie  # adjust import path if your Movie model lives elsewhere


# --------------------------------------------------
# CONFIG
# --------------------------------------------------

# Get API key from env or .env
TMDB_API_KEY = os.environ.get("TMDB_API_KEY")

# How many pages per era to fetch from TMDb (20 movies per page typically)
PAGES_PER_ERA = 50  # raise to 5, 10, etc. for more movies

# Eras to pull from (start_year, end_year, label_for_logs)
ERAS: List[Tuple[int, int, str]] = [
    (1970, 1979, "70s"),
    (1980, 1989, "80s"),
    (1990, 1999, "90s"),
    (2000, 2009, "00s"),
    (2010, 2019, "10s"),
    (2020, datetime.now().year, "20s+"),
]

TMDB_BASE = "https://api.themoviedb.org/3"


def tmdb_discover_horror(year_start: int, year_end: int, page: int) -> Dict[str, Any]:
    """
    Query TMDb /discover/movie for horror films in a date range.
    Sorts by popularity.desc so we get recognizable stuff first.
    """
    params = {
        "api_key": TMDB_API_KEY,
        "with_genres": "27",  # TMDb genre 27 = Horror
        "include_adult": "false",
        "language": "en-US",
        "sort_by": "popularity.desc",
        "page": page,
        "primary_release_date.gte": f"{year_start}-01-01",
        "primary_release_date.lte": f"{year_end}-12-31",
    }
    resp = requests.get(f"{TMDB_BASE}/discover/movie", params=params, timeout=15)
    resp.raise_for_status()
    return resp.json()


def tmdb_details(movie_id: int) -> Dict[str, Any]:
    """
    Query TMDb /movie/{id} for full details (overview, genres, poster, etc.).
    We also ask for release_dates because (later) we could grab ratings or region certs.
    """
    params = {
        "api_key": TMDB_API_KEY,
        "language": "en-US",
        "append_to_response": "release_dates",
    }
    resp = requests.get(f"{TMDB_BASE}/movie/{movie_id}", params=params, timeout=15)
    resp.raise_for_status()
    return resp.json()


def slugify(title: str, year: int | None) -> str:
    """
    Make a URL-safe-ish slug: lowercase, hyphenated words, drop punctuation.
    Append year if we have it to avoid collisions like "Halloween".
    """
    safe_title = (
        title.lower()
        .replace("'", "")
        .replace('"', "")
        .replace(":", "")
        .replace(",", "")
        .replace(".", "")
        .replace("?", "")
        .replace("!", "")
        .replace("&", "and")
        .replace("/", " ")
        .replace("\\", " ")
    )
    safe_title = "-".join([part for part in safe_title.split() if part])
    if year:
        return f"{safe_title}-{year}"
    return safe_title


def normalize_movie(tmdb_obj: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert a TMDb movie object into the shape we want in our DB layer.
    Returns a dict with keys:
    - title
    - slug
    - year
    - overview
    - posterUrl
    - subgenres (list[str])
    """
    title = (
        tmdb_obj.get("title")
        or tmdb_obj.get("original_title")
        or "Untitled"
    )

    release_date = tmdb_obj.get("release_date") or ""
    year = None
    if release_date and len(release_date) >= 4:
        try:
            year = int(release_date[:4])
        except:
            year = None

    poster_path = tmdb_obj.get("poster_path")
    poster_url = (
        f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None
    )

    overview = tmdb_obj.get("overview") or None

    # Genres appear either as dicts (from details) or we may inject plain strings.
    genres_list = tmdb_obj.get("genres") or tmdb_obj.get("genre_names") or []
    subgenres: List[str] = []
    for g in genres_list:
        if isinstance(g, dict):
            nm = g.get("name")
        else:
            nm = g
        if nm:
            subgenres.append(nm)

    # Deduplicate while preserving order
    subgenres = list(dict.fromkeys(subgenres))

    return {
        "title": title,
        "slug": slugify(title, year),
        "year": year,
        "overview": overview,
        "posterUrl": poster_url,
        "subgenres": subgenres,
    }


def seed_movies():
    """
    Crawl TMDb by era and page, normalize data, and insert rows into SQLite.
    - We store subgenres as a JSON string (SQLite TEXT) so inserts don't blow up.
    - We include tmdb_id because your DB schema requires it (NOT NULL).
    - We map poster_path column to posterUrl value.
    """
    if not TMDB_API_KEY or TMDB_API_KEY == "YOUR_TMDB_KEY_HERE":
        raise RuntimeError(
            "Missing TMDB_API_KEY. Add it to backend/.env or set it in your environment."
        )

    init_db()

    inserted = 0
    skipped = 0

    # Keep track of TMDb IDs we've already processed so we don't repeat
    seen_tmdb_ids: Set[int] = set()

    with get_session() as session:
        for (start_y, end_y, era_label) in ERAS:
            print(f"=== Fetching era {era_label} ({start_y}-{end_y}) ===")

            for page in range(1, PAGES_PER_ERA + 1):
                print(f"  > page {page}")
                try:
                    raw = tmdb_discover_horror(start_y, end_y, page)
                except Exception as e:
                    print(f"    ! Failed discover call: {e}")
                    continue

                results = raw.get("results", []) or []
                if not results:
                    print("    (no results)")
                    continue

                for r in results:
                    tmdb_id = r.get("id")
                    if tmdb_id is None:
                        continue

                    # skip if we already handled this movie_id this run
                    if tmdb_id in seen_tmdb_ids:
                        continue
                    seen_tmdb_ids.add(tmdb_id)

                    # fetch full details
                    try:
                        full = tmdb_details(tmdb_id)
                    except Exception as e:
                        print(f"    ! Failed details for {tmdb_id}: {e}")
                        continue

                    # give normalize_movie a flat list of genre names
                    full["genre_names"] = [
                        g.get("name") for g in full.get("genres", []) if g.get("name")
                    ]

                    movie_data = normalize_movie(full)

                    # skip obvious broken results
                    if not movie_data["title"]:
                        continue

                    slug = movie_data["slug"]

                    # subgenres needs to be text-friendly for SQLite
                    subgenres_raw = movie_data["subgenres"]
                    if isinstance(subgenres_raw, list):
                        subgenres_value = json.dumps(subgenres_raw)
                    else:
                        subgenres_value = subgenres_raw

                    # check if slug already in DB
                    existing = session.exec(
                        select(Movie).where(Movie.slug == slug)
                    ).first()

                    if existing:
                        skipped += 1
                        continue

                    # Build Movie row that matches your DB columns
                    # NOTE: your table columns (from the error) are:
                    #   tmdb_id, slug, title, year, overview, poster_path, subgenres
                    mv = Movie(
                        tmdb_id=tmdb_id,
                        slug=movie_data["slug"],
                        title=movie_data["title"],
                        year=movie_data["year"],
                        overview=movie_data["overview"],
                        poster_path=movie_data["posterUrl"],
                        subgenres=subgenres_value,
                    )

                    session.add(mv)
                    inserted += 1

                # commit for this page
                session.commit()

    print("--------------")
    print(f"Inserted: {inserted}")
    print(f"Skipped (already existed): {skipped}")
    print("Done.")
    print("--------------")


if __name__ == "__main__":
    seed_movies()
