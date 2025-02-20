from fastapi import APIRouter, UploadFile, File, Depends, Form
from sqlalchemy.orm import Session
from schemas import meetingSchema
from database import get_db
from controller import meetingController



router = APIRouter(prefix="/meeting",
    tags=["Meeting"],
    responses={404: {"description": "Not found"}},
)

@router.post("/upload-audio")
async def upload_audio(
    date: str = Form(...),
    file: UploadFile = File(...),
    session: Session = Depends(get_db)
):
    return await meetingController.process_upload(date, file, session)

@router.post("/process_meeting/{transcription_id}")
def upload_audio(
    transcription_id : int,
    session: Session = Depends(get_db)
):
    return meetingController.process_transcirption(transcription_id, session)


