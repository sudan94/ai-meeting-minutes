from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from models.models import Transcription, Meeting
from schemas.transcriptionSchema import TranscriptionCreate
from database import get_db
from openai import OpenAI
import whisper
import os
from datetime import datetime
from dateutil.parser import parse
import json
from dotenv import load_dotenv

load_dotenv()
# Load Whisper Model (for Speech-to-Text)
whisper_model = whisper.load_model("base")


client = OpenAI(
    api_key= os.getenv("OPENAI_API_KEY") # This is the default and can be omitted
)

async def process_upload(date, file, session):
    try:
        date_clean = date.replace(":", "-").replace("T", "_")
        directory = f"recordings/{date_clean}"
        os.makedirs(directory, exist_ok=True)  # Creates if not exists
        file_path = f"{directory}/{file.filename}"
        with open(file_path, "wb") as f:
            f.write(await file.read())
        # Convert Speech to Text
        result = whisper_model.transcribe(file_path, fp16=False)

        # os.remove(file_path)  # Cleanup temp file
         # Parse date safely
        try:
            date_obj = datetime.strptime(date, "%Y-%m-%dT%H:%M:%S")  # ISO format
        except ValueError:
            date_obj = parse(date)  # Fallback for flexible date parsing
        # Store in the database
        transcription_data = TranscriptionCreate(
            transcript=result["text"],
            created_at=datetime.now(),
        )

        stored_transcription = create_transcription(transcription_data, session)

        return {"transcript": stored_transcription.transcript}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def create_transcription(transcription: TranscriptionCreate, db: Session):
    db_transcription = Transcription(**transcription.dict())
    db.add(db_transcription)
    db.commit()
    db.refresh(db_transcription)
    return db_transcription

def process_transcirption(transcription_id: int, db: Session = Depends(get_db)):

    # Fetch transcription from the database
    transcription = db.query(Transcription).filter(Transcription.id == transcription_id).first()

    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")

    # Generate structured data using OpenAI
    prompt = f"""
    Read the metting transcript and extract the summery of the transcript. Do not include anything from yur side just understand the metting and give the following. The out put should be in JSON:

    Transcript:
    {transcription.transcript}

    Provide:
    - A concise title for the meeting.
    - Key points discussed (as bullet points).
    - Action items.

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
  ]

    """

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": prompt}],
        response_format={ "type": "json_object" }
    )

    # Extract response
    content = response.choices[0].message.content
    print(content)

    # Parse response (assuming OpenAI returns structured JSON)
    try:
        structured_data = json.loads(content)
        title = structured_data.get("title", "Untitled Meeting")
        key_points = structured_data.get("key_points", [])
        action_items = structured_data.get("action_items", [])
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response")

    # Convert lists to text or JSON string (depending on storage method)
    key_points_str = json.dumps(key_points)  # Store as JSON string
    action_items_str = json.dumps(action_items)  # Store as JSON string


    # Save meeting data to the database
    new_meeting = Meeting(
        title=title,
        date=datetime.now(),
        transcript_id=transcription_id,
        key_points=key_points_str,
        action_items=action_items_str,
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

