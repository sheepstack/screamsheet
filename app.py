# app.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # loosened for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MOVIES = [
    {"slug":"evil-dead-2-1987","title":"Evil Dead II","year":1987,"subgenres":["Slapstick Horror","Cabin","Possession"]},
    {"slug":"hereditary-2018","title":"Hereditary","year":2018,"subgenres":["Supernatural","Family Horror","Cult"]},
    {"slug":"scream-1996","title":"Scream","year":1996,"subgenres":["Slasher","Meta","Whodunnit"]},
]

@app.get("/movies")
def list_movies():
    return MOVIES

@app.get("/movies/{slug}")
def get_movie(slug: str):
    m = next((x for x in MOVIES if x["slug"] == slug), None)
    if not m:
        raise HTTPException(404, "Movie not found")
    return m

@app.get("/movies/{slug}/scores")
def get_scores(slug: str):
    # Temporary stub so the UI can render
    # Return empty scores structure the frontend expects
    keys = ["panic","splatter","dread","creature","fun","plot","rewatch"]
    return {
        "counts": 0,
        "averages": {k: None for k in keys},
        "consensus": {k: None for k in keys},
    }

@app.post("/movies/{slug}/ratings")
def post_rating(slug: str, payload: dict):
    # Stub accept — just echo back
    m = next((x for x in MOVIES if x["slug"] == slug), None)
    if not m:
        raise HTTPException(404, "Movie not found")
    return {"ok": True}
