#to handle the user auth module

from passlib.context import CryptContext
import os
from datetime import datetime,timedelta,timezone
from jose import JWTError,jwt
from dotenv import load_dotenv
from typing import Optional
from . import database,schemas,models,crud
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends,HTTPException, status
from sqlalchemy.orm import Session



load_dotenv(dotenv_path=r"app\.env")

secretkey = os.getenv("SECRET_KEY")
algorithm = os.getenv("ALGORITHM")
accesstoken = int(os.getenv("ACCESS_TOKEN_TIME"))


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

if not secretkey or not algorithm:
    raise RuntimeError('Missing JWT configuration')
pwd_context = CryptContext(schemes = ["argon2"], deprecated='auto')

def verify_password(plain_password,hashed_password):
    return pwd_context.verify(plain_password,hashed_password)

def get_password_hash(password):

    return pwd_context.hash(password)


def create_access_token(data: dict, expiry_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expiry_delta:
        expire = datetime.now(timezone.utc) + expiry_delta
    else:
        expire = datetime.now(timezone.utc)  + timedelta(minutes= accesstoken)


    to_encode.update({'exp':expire})


    encoded_JWT = jwt.encode(
        to_encode,
        secretkey,
        algorithm=algorithm)
    
    return encoded_JWT



def get_current_user(db: Session = Depends(database.get_database), token : str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code = status.HTTP_401_UNAUTHORIZED,
        detail = "Could not validate credentials",
        headers= {"WWW_Authenticate":"Bearer"})
    
    try:
        payload = jwt.decode(token, secretkey,algorithms=[algorithm])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    user = crud.get_user_by_email(db, email = token_data.email)
    if user is None:
        raise credentials_exception
    return user