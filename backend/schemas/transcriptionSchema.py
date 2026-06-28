from pydantic import BaseModel
from datetime import datetime

class TranscriptionBase(BaseModel):
    transcript : str
    file_name : str
    uuid : str

class TranscriptionCreate(TranscriptionBase):
    pass

class TranscriptionResponse(TranscriptionBase):
    id : int

    class Config:
        from_attributes = True