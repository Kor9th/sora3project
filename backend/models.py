from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from .database import Base
#from



class User(Base):
    __tablename__= "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True,index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean,default=True)
    is_verified = Column(Boolean, default=False) 


class VideoGeneration(Base):
    __tablename__ = "video_generations"

    id = Column(Integer,primary_key= True)
    pass