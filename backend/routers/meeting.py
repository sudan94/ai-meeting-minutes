from fastapi import APIRouter, UploadFile, File, Depends, Form, BackgroundTasks, HTTPException
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

@router.get("/processing-status/{task_id}")
def get_processing_status(task_id: str):
    return meetingController.get_processing_status(task_id)

@router.get("/get_meetings")
def get_meetings(skip: int = 0, limit: int = 10, session: Session = Depends(get_db)):
    return meetingController.getMeetings(session, skip=skip, limit=limit)

@router.get("/get_meeting_by_id/{id}")
def get_meeting_by_id(id: int, session: Session = Depends(get_db)):
    return meetingController.getMeeting(id, session)

@router.delete("/delete_meeting/{id}")
def delete_meeting(id: int, session: Session = Depends(get_db)):
    success = meetingController.deleteMeeting(id, session)
    if not success:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"message": "Meeting deleted successfully"}

@router.get("/send_to_trello/{id}")
def send_to_trello(id:int, session: Session = Depends(get_db)):
    print("aaa")
    return meetingController.sendMeetingTrello(id, session)