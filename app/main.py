from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from . import models,crud,schemas
from datetime import timedelta
from.database import engine, SessionLocal, get_database
from fastapi.security import OAuth2PasswordRequestForm
from . import auth
from fastapi.middleware.cors import CORSMiddleware






app = FastAPI()

origins = [
    "http://localhost:3000",  # Common for React
    "http://localhost:5174",  # Common for Vite/Vue
    "http://127.0.0.1:5500",  # Common for Live Server (VS Code)
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows all (GET, POST, etc.)
    allow_headers=["*"], # Allows all headers
)

models.Base.metadata.create_all(bind=engine)

@app.post("/signup", response_model=schemas.User)
def signup(user:schemas.UserCreate, db: Session = Depends(get_database)):
    
    
    db_user = crud.get_user_by_email(db,email = user.email)
    if db_user:
        raise HTTPException(status_code = 400, detail = "Email already Exists")
    
    new_user = crud.create_user(db=db, user=user)
    return new_user

@app.post("/token", response_model=schemas.Token)
def login_for_access_token(db: Session = Depends(get_database), form_data: OAuth2PasswordRequestForm = Depends()):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not auth.verify_password(form_data.password,user.hashed_password):
        raise HTTPException(
            status_code= 401,
            detail="Incorrect email or password",
            headers = {"WWW-Authenticate":"Bearer"}
        )

    access_token_expires = timedelta(minutes=auth.accesstoken)
    access_token = auth.create_access_token(data={"sub":user.email}, expiry_delta=access_token_expires)
    return {"access_token":access_token, "token_type":"bearer"}

@app.get("/users/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@app.get("/verify")
def verify_user(token: str, db: Session = Depends(get_database)):
                return {"message": "Email verified succesfully"}