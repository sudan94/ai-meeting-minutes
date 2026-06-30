from fastapi import HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from models.models import Transcription, Meeting, Trello, TranscriptionVector
from schemas.transcriptionSchema import TranscriptionCreate
from database import SessionLocal
from openai import OpenAI
import os
from datetime import datetime
import json
from dotenv import load_dotenv
from typing import Dict
import uuid
from pathlib import Path
import requests
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

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

        # Transcribe via OpenAI Whisper API
        with open(file_path, "rb") as audio_file:
            transcription_result = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
            )
        processing_status[task_id]["progress"] = 50

        transcription_data = TranscriptionCreate(
            transcript=transcription_result.text,
            file_name=filename,
            uuid=meeting_uuid,
        )

        stored_transcription = create_transcription(transcription_data, db)
        processing_status[task_id]["progress"] = 70

        transcrpitToVector(stored_transcription.id, db)
        processing_status[task_id]["progress"] = 80

        transcript = process_transcription(stored_transcription.id, db)
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

async def process_upload(file, background_tasks: BackgroundTasks):
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
    db_transcription = Transcription(**transcription.model_dump())
    db.add(db_transcription)
    db.commit()
    db.refresh(db_transcription)
    return db_transcription

def process_transcription(transcription_id: int, db: Session):
    transcription = db.query(Transcription).filter(Transcription.id == transcription_id).first()

    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")

    # Generate structured data using OpenAI
    prompt = f"""
You are an expert meeting analyst. Carefully read the following meeting transcript and extract structured information. Only use what is explicitly stated in the transcript — do not add or infer anything.

Transcript:
{transcription.transcript}

Return a JSON object with these exact fields:
- "title": a concise, descriptive title for the meeting (string)
- "summary": a 2-4 sentence summary of what was discussed and decided (string)
- "participants": list of names of people who spoke or were mentioned (array of strings)
- "key_points": list of the main topics and decisions covered (array of strings, be thorough)
- "action_items": list of tasks assigned or next steps agreed upon (array of strings, be thorough)

Example format:
{{
  "title": "Q3 Product Roadmap Planning",
  "summary": "The team reviewed Q2 results and planned the Q3 roadmap. Key decisions were made around feature prioritization and resource allocation.",
  "participants": ["Alice", "Bob", "Carol"],
  "key_points": ["Q2 revenue exceeded target by 12%", "Mobile app to be prioritized in Q3"],
  "action_items": ["Alice to draft technical spec by Friday", "Bob to schedule customer interviews"]
}}
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

def getMeetings(db: Session, skip: int = 0, limit: int = 5):
    try:
        # Get total count
        total = db.query(Meeting).count()

        # Get paginated meetings
        meetings = db.query(Meeting).order_by(Meeting.date.desc()).offset(skip).limit(limit).all()

        return {
            "total": total,
            "meetings": meetings
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch meetings: {str(e)}")

def getMeeting(id: int, db: Session):
    try:
        meeting = db.query(Meeting).filter(Meeting.id == id).first()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")

        trello = db.query(Trello).filter(Trello.meeting_id == id).first()
        transcription = db.query(Transcription).filter(Transcription.id == meeting.transcript_id).first()

        result = {
            "id": meeting.id,
            "title": meeting.title,
            "filename": transcription.file_name if transcription else None,
            "created_at": meeting.created_at,
            "summary": meeting.summary,
            "participants": meeting.participants,
            "key_points": meeting.key_points,
            "action_items": meeting.action_items,
            "transcript": transcription.transcript if transcription else None,
            "trello": trello is not None,
        }
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch meeting: {str(e)}")

def deleteMeeting(id: int, db: Session):
    meeting = db.query(Meeting).filter(Meeting.id == id).first()
    if not meeting:
        return False

    transcript = db.query(Transcription).filter(Transcription.id == meeting.transcript_id).first()

    # Delete the audio file if it exists
    if transcript and transcript.created_at:
        dt = transcript.created_at
        audio_path = Path("recordings") / dt.strftime("%Y") / dt.strftime("%m") / transcript.uuid / transcript.file_name
        if os.path.exists(audio_path):
            os.remove(audio_path)

    # Delete the meeting record
    db.delete(meeting)
    db.commit()
    return True

def searchMeetings(query: str, db: Session, limit: int = 5):
    if not query.strip():
        return []

    try:
        response = client.embeddings.create(
            model="text-embedding-3-large",
            input=[query],
        )
        query_vector = response.data[0].embedding
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to embed query: {str(e)}")

    distance_expr = TranscriptionVector.vector.cosine_distance(query_vector).label("distance")

    try:
        rows = (
            db.query(
                Meeting.id,
                Meeting.title,
                Meeting.summary,
                Meeting.created_at,
                TranscriptionVector.chunk_text,
                distance_expr,
            )
            .join(Transcription, Meeting.transcript_id == Transcription.id)
            .join(TranscriptionVector, TranscriptionVector.transcription_id == Transcription.id)
            .filter(distance_expr <= 0.7)
            .order_by(distance_expr)
            .limit(limit * 3)
            .all()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vector search query failed: {str(e)}")

    # One result per meeting — keep the chunk with the lowest distance
    seen: dict = {}
    for row in rows:
        meeting_id = row[0]
        if meeting_id not in seen:
            seen[meeting_id] = {
                "meeting_id": row[0],
                "title": row[1],
                "summary": row[2],
                "created_at": row[3],
                "chunk_text": row[4],
                "score": round(1 - row[5], 4),
            }

    return list(seen.values())[:limit]


def sendMeetingTrello(id: int, db: Session):
    meeting = db.query(Meeting).filter(Meeting.id == id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    existing = db.query(Trello).filter(Trello.meeting_id == id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Meeting already sent to Trello")

    key_points = "".join(f"- {p}\n" for p in json.loads(meeting.key_points))
    action_items = "".join(f"- {a}\n" for a in json.loads(meeting.action_items))
    participants = ", ".join(json.loads(meeting.participants))

    description = f"""## Summary\n{meeting.summary}\n\n## Key Points\n{key_points}\n## Action Items\n{action_items}\n## Participants\n{participants}\n"""

    payload = {
        "idList": os.getenv("TRELLO_LIST_ID"),
        "name": meeting.title,
        "desc": description,
        "key": os.getenv("TRELLO_API_KEY"),
        "token": os.getenv("TRELLO_API_TOKEN"),
    }

    try:
        response = requests.post(
            "https://api.trello.com/1/cards",
            params=payload,
            headers={"Accept": "application/json"},
            timeout=10,
        )
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Trello API error: {str(e)}")

    new_trello = Trello(meeting_id=id)
    db.add(new_trello)
    db.commit()
    db.refresh(new_trello)
    return {"status": "created"}


def transcrpitToVector(id: int, db: Session):

    transcription = db.query(Transcription).filter(Transcription.id == id).first()
    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")

    splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=150
    )

    chunks = splitter.split_text(transcription.transcript)


    try:
        response = client.embeddings.create(
            model="text-embedding-3-large",
            input=chunks
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate embeddings: {str(e)}")

    for i, embedding_obj in enumerate(response.data):
        db.add(TranscriptionVector(
            transcription_id=id,
            chunk_index=i,
            chunk_text=chunks[i],
            vector=embedding_obj.embedding,
        ))
    db.commit()