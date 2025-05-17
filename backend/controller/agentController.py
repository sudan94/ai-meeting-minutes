from langchain.vectorstores import FAISS
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.document_loaders import TextLoader
from meetingController import getMeeting
import json
from database import get_db
from sqlalchemy.orm import Session
from fastapi import Depends

def create_embedding(id, db:Session = Depends(get_db)):
    meetings = getMeeting(id,db)

    docs = [f"Meeting {m['id']}: {m['title']} - {m['action_items']} - {m['key_points']}" for m in meetings]

    #store embedding in FAISS
    embeddings = OpenAIEmbeddings()
    vector_store = FAISS.from_texts(docs, embeddings)
    vector_store.save_local("meeting_index")

