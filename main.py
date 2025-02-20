from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import SessionLocal, engine
from models.models import Transcription, Meeting
from routers import meeting

# create table is its not created
Meeting.metadata.create_all(bind = engine)
Transcription.metadata.create_all(bind = engine)
app = FastAPI()

origins = [
    "*",
    "http://localhost",  # Example: Allow local development server

]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
async def home():
    return {"status": "ok"}

app.include_router(meeting.router)