from pathlib import Path
from sqlmodel import SQLModel, create_engine, Session

# Always store DB next to this file
DB_PATH = Path(__file__).with_name("horror.db")
engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    return Session(engine)
