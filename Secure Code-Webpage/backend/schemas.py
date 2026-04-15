from pydantic import BaseModel, field_validator
from typing import List, Optional

class FileModel(BaseModel):
    filename: str
    content: str

    @field_validator('filename')
    @classmethod
    def validate_filename(cls, v):
        if not v or not v.strip():
            raise ValueError('Filename cannot be empty')
        if len(v) > 255:
            raise ValueError('Filename must be 255 characters or less')
        return v

    @field_validator('content')
    @classmethod
    def validate_content(cls, v):
        if len(v) > 100_000:
            raise ValueError('File content exceeds 100 KB limit. Please split into smaller files.')
        return v

class ScanRequest(BaseModel):
    files: List[FileModel]
    language: str = "python"

    @field_validator('files')
    @classmethod
    def validate_files(cls, v):
        if len(v) == 0:
            raise ValueError('At least one file is required')
        if len(v) > 10:
            raise ValueError('Maximum 10 files allowed per scan request')
        return v

    @field_validator('language')
    @classmethod
    def validate_language(cls, v):
        supported = ("python", "javascript")
        if v.lower() not in supported:
            raise ValueError(f'Language must be one of: {", ".join(supported)}')
        return v.lower()