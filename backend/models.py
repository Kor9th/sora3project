from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from .database import Base
from sqlalchemy.orm import relationship
import datetime



class User(Base):
    __tablename__= "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True,index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean,default=True)
    is_verified = Column(Boolean, default=False) 
    videos = relationship("VideoGeneration", back_populates="owner")


class VideoGeneration(Base):
    __tablename__ = "video_generations"

    id = Column(Integer,primary_key= True)
    prompt = Column(String)
    video_url = Column(String)
    status = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.timezone.utc))
    user_id = Column(Integer, ForeignKey('users.id'))
    owner = relationship("User", back_populates="videos")
