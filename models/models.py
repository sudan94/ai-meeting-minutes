from sqlalchemy import Column, Integer, Text, DateTime, String, ForeignKey
from database import Base
from datetime import datetime

class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    date = Column(DateTime, nullable=False)
    transcript_id = Column(Integer, ForeignKey("transcriptions.id"), nullable=False)
    key_points = Column(Text)  # Store as JSON or comma-separated text
    action_items = Column(Text)  # Store as JSON or comma-separated text
    created_at = Column(DateTime, default=datetime.now)

class Transcription(Base):
    __tablename__ = "transcriptions"

    id = Column(Integer, primary_key=True, index=True)
    transcript = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.now)