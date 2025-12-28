from fastapi import HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from models.models import Transcription, Meeting
from schemas.transcriptionSchema import TranscriptionCreate
from database import get_db, SessionLocal
from openai import OpenAI
import whisper
import os
from datetime import datetime
from dateutil.parser import parse
import json
from dotenv import load_dotenv
from typing import Dict, List
import uuid
from pathlib import Path

load_dotenv()
# Load Whisper Model (for Speech-to-Text)
whisper_model = whisper.load_model("base")

# Dictionary to store processing status
processing_status: Dict[str, dict] = {}

client = OpenAI(
    api_key= os.getenv("OPENAI_API_KEY")
)

async def process_upload_background(file_content: bytes, filename: str, task_id: str):
    db = SessionLocal()
    try:
        # Initialize processing status
        processing_status[task_id] = {
            "status": "processing",
            "progress": 0,
            "filename": filename
        }

        meeting_uuid = str(uuid.uuid4())
        now = datetime.now()
        directory = (
            Path("recordings")
            / now.strftime("%Y")
            / now.strftime("%m")
            / meeting_uuid
        )

        os.makedirs(directory, exist_ok=True)
        file_path = f"{directory}/{filename}"

        with open(file_path, "wb") as f:
            f.write(file_content)

        processing_status[task_id]["progress"] = 20

        # Convert Speech to Text
        result = whisper_model.transcribe(file_path, fp16=False)
        processing_status[task_id]["progress"] = 50

        transcription_data = TranscriptionCreate(
            transcript=result["text"],
            file_name=filename,
        )

        stored_transcription = create_transcription(transcription_data, db)
        processing_status[task_id]["progress"] = 70

        transcript = process_transcirption(stored_transcription.id, db)
        processing_status[task_id]["progress"] = 90

        # Get the meeting ID from the transcript result
        meeting_id = transcript.get("id")

        processing_status[task_id] = {
            "status": "completed",
            "progress": 100,
            "result": transcript,
            "meeting_id": meeting_id,
            "filename": filename
        }

    except Exception as e:
        processing_status[task_id] = {
            "status": "error",
            "error": str(e),
            "filename": filename
        }
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

async def process_upload(file, session: Session, background_tasks: BackgroundTasks):
    try:
        # Generate a unique task ID
        task_id = f"task_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        # Initialize processing status
        processing_status[task_id] = {
            "status": "pending",
            "progress": 0,
            "filename": file.filename
        }

        # Read the file content before it's closed
        file_content = await file.read()

        # Add the background task with the file content
        background_tasks.add_task(
            process_upload_background,
            file_content,
            file.filename,
            task_id
        )

        return {
            "task_id": task_id,
            "message": "Processing started",
            "status": "pending"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def get_processing_status(task_id: str):
    if task_id not in processing_status:
        raise HTTPException(status_code=404, detail="Task not found")
    return processing_status[task_id]

def create_transcription(transcription: TranscriptionCreate, db: Session):
    db_transcription = Transcription(**transcription.dict())
    db.add(db_transcription)
    db.commit()
    db.refresh(db_transcription)
    return db_transcription

def process_transcirption(transcription_id: int, db: Session):
    transcription = db.query(Transcription).filter(Transcription.id == transcription_id).first()

    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")

    # Generate structured data using OpenAI
    prompt = f"""
    Read the metting transcript and extract the summery of the transcript. Do not include anything from yur side just understand the metting and give the following. The output should be in JSON:

    Transcript:
    {transcription.transcript}

    Provide:
    - A concise title for the meeting.
    - Key points discussed (as bullet points).
    - Action items.
    - Summary
    - Participants
    - Add as many points and participants for key_points, actions_items and participate

    Example JSON format:

  "title": "title xyz",
  "key_points": [
    "key point 1",
    "key point 2",
    "key point 3"
  ],
  "action_items": [
    "action items 1",
    "action items 2",
    "action items 3",
  ],
  "summary" : "summary of the whole meeting",
  "participants" : [
  "Person 1",
  "person 2"
  ]

    """

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": prompt}],
        response_format={ "type": "json_object" }
    )

    content = response.choices[0].message.content

    try:
        structured_data = json.loads(content)
        title = structured_data.get("title", "Untitled Meeting")
        key_points = structured_data.get("key_points", [])
        action_items = structured_data.get("action_items", [])
        summary = structured_data.get("summary", "No summary")
        participants = structured_data.get("participants", [])

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response")

    key_points_str = json.dumps(key_points)
    action_items_str = json.dumps(action_items)
    participants_items_str = json.dumps(participants)

    # Save meeting data to the database
    new_meeting = Meeting(
        title=title,
        date=datetime.now(),
        transcript_id=transcription_id,
        key_points=key_points_str,
        action_items=action_items_str,
        summary=summary,
        participants=participants_items_str,
        created_at=datetime.now()
    )

    db.add(new_meeting)
    db.commit()
    db.refresh(new_meeting)

    return {
        "id": new_meeting.id,
        "title": new_meeting.title,
        "date": new_meeting.date,
        "transcript_id": new_meeting.transcript_id,
        "key_points": key_points,
        "action_items": action_items,
        "created_at": new_meeting.created_at
    }

def getMeetings(db: Session):
    try:
        meetings = db.query(Meeting).all()
        return meetings
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch meetings: {str(e)}")

def getMeeting(id: int, db: Session):
    try:
        meeting = db.query(Meeting).filter(Meeting.id == id).first()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        return meeting
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch meeting: {str(e)}")

def deleteMeeting(id: int, session: Session):
    meeting = session.query(Meeting).filter(Meeting.id == id).first()
    if not meeting:
        return False

    # Delete the audio file if it exists
    # if meeting.audio_path and os.path.exists(meeting.audio_path):
    #     os.remove(meeting.audio_path)

    # Delete the meeting record
    session.delete(meeting)
    session.commit()
    return True

def process_meeting(meeting_id: int, session: Session):
    # This is where you would implement the actual processing logic
    # For now, we'll just update the status
    meeting = session.query(Meeting).filter(Meeting.id == meeting_id).first()
    if meeting:
        meeting.status = "completed"
        session.commit()