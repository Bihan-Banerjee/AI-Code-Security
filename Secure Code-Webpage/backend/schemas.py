# backend/schemas.py
from pydantic import BaseModel
from typing import List, Optional

class FileModel(BaseModel):
    filename: str
    content: str

class ScanRequest(BaseModel):
    files: List[FileModel]
    language: str = "python"
