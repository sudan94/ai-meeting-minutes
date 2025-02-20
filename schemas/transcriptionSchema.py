from pydantic import BaseModel
from datetime import datetime

class TranscriptionBase(BaseModel):
    transcript : str
    created_at : datetime

class TranscriptionCreate(TranscriptionBase):
    pass

class TranscriptionResponse(TranscriptionBase):
    id : int

    class config:
        from_attribute = True # ORM for sql alchmey support