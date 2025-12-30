from pydantic import BaseModel, EmailStr, Field, computed_field
from typing import Optional
import datetime


class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=72)


class User(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class VideoCreate(BaseModel):
    prompt: str
    size_str: str

class VideoResponse(BaseModel):
    id: int
    prompt: str
    status: str
    created_at: datetime.datetime
    @computed_field
    @property
    def stream_url(self)-> str:
        return f"/videos/{self.id}/stream"

    class Config:
        from_attributes = True
