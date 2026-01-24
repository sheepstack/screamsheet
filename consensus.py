# backend/consensus.py
def label(metric: str, value: float) -> str:
    # thresholds: low ≤ 2.4, med 2.5–3.9, high ≥ 4.0
    if value < 2.5:
        lvl = "low"
    elif value < 4.0:
        lvl = "medium"
    else:
        lvl = "high"

    table = {
        "panic":   {"low": "Safe for Sleep",      "medium": "Creepy Enough",        "high": "Nightmare Fuel"},
        "splatter":{"low": "Barely a Scratch",    "medium": "Messy But Manageable", "high": "Bloodbath Approved"},
        "dread":   {"low": "Tame Shadows",        "medium": "Mildly Uneasy",        "high": "Uncanny Terror"},
        "creature":{"low": "Forgettable Fiend",   "medium": "Decent Boogeyman",     "high": "Iconic Nightmare Fuel"},
        "fun":     {"low": "Dead Serious",        "medium": "Cheeky Chills",        "high": "Cult Classic Energy"},
        "plot":    {"low": "Plot in Pieces",      "medium": "Solid Spine-Tingler",  "high": "Masterpiece of Fear"},
        "rewatch": {"low": "One and Done",        "medium": "Occasional Visit",     "high": "Perennial Haunt"},
    }
    return table[metric][lvl]
