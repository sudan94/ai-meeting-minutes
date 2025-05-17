from fastapi import APIRouter, UploadFile, File, Depends, Form, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from controller import meetingController
from datetime import datetime


router = APIRouter(prefix="/meeting",
    tags=["Meeting"],
    responses={404: {"description": "Not found"}},
)

@router.post("/upload-audio")
async def upload_audio(
    file: UploadFile = File(...),
    session: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    return await meetingController.process_upload(file, session, background_tasks)

# @router.post("/process_meeting/{transcription_id}")
# def upload_audio(
#     transcription_id : int,
#     session: Session = Depends(get_db)
# ):
#     return meetingController.process_transcirption(transcription_id, session)

@router.get("/processing-status/{task_id}")
def get_processing_status(task_id: str):
    return meetingController.get_processing_status(task_id)

@router.get("/get_meetings")
def get_meetings(session: Session = Depends(get_db)):
    return meetingController.getMeetings(session)

@router.get("/get_meeting_by_id/{id}")
def get_meeting_by_id(id: int, session: Session = Depends(get_db)):
    return meetingController.getMeeting(id, session)