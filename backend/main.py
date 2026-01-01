from fastapi import FastAPI, Depends, HTTPException,File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import Optional
import base64
import requests
from datetime import timedelta
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from . import models, crud, schemas, auth , videogen, database
from .database import engine, get_database
from fastapi import BackgroundTasks
from fastapi.responses import StreamingResponse
import time

app = FastAPI()


origins = [
    "http://localhost:3000",  # Common for React
    "http://localhost:5173",  # Common for Vite/Vue
    "http://127.0.0.1:5500",  # Common for Live Server (VS Code)
]

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {"status": "backend running"}


@app.post("/signup", response_model=schemas.User)
def signup(user: schemas.UserCreate, db: Session = Depends(get_database)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already Exists")

    new_user = crud.create_user(db=db, user=user)
    return new_user


@app.post("/token", response_model=schemas.Token)
def login_for_access_token(
    db: Session = Depends(get_database),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=auth.accesstoken)
    access_token = auth.create_access_token(
        data={"sub": user.email},
        expiry_delta=access_token_expires,
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/users/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


@app.get("/verify")
def verify_user(token: str, db: Session = Depends(get_database)):
                return {"message": "Email verified succesfully"}

def get_generation_video_url(generation_id: str):
    url = f"{videogen.SORA_ENDPOINT}/video/generations/{generation_id}/content/video?api-version=preview&api-key={videogen.SORA_KEY}"
    return url


def run_azure(video_id:int , prompt:str,size_str:str,sec:str,image:str = None):
    db = database.SessionLocal()
    try:
            initial_response = videogen.request_video(prompt,size_str,sec,image)
            job_id = initial_response.get("id")
            

            while True:
                status_data = videogen.get_generation_status(job_id)
                if not status_data:
                    raise Exception("Failed to get status data")
                status = status_data.get("status")

                video_record = db.query(models.VideoGeneration).filter(models.VideoGeneration.id==video_id).first()

                if status == "succeeded":
                    generations = status_data.get("generations", [])
                    if generations:
                        generation_id = generations[0].get("id")
                        video_url = get_generation_video_url(generation_id)
                        clean_url = video_url.split('?')[0]
                        video_record.video_url = clean_url
                        video_record.status = "Completed"
                        db.commit()
                        break

                elif status == "failed":
                   
                    video_record.status = "Failed"
                    db.commit()
                    break
                else:
                    
                    import time
                    time.sleep(2)  
                    
                   
    except Exception as e:
            print(f"background task error: {e}")
            video_record = db.query(models.VideoGeneration).filter(models.VideoGeneration.id==video_id).first()
            if video_record:
                video_record.status ="failed"
                db.commit()
    finally:
          db.close()


def video_create_as_form(
    prompt: str = Form(...),
    size_str: str = Form("1080x1080"),
    sec: str = Form(2)
) -> schemas.VideoCreate:
    return schemas.VideoCreate(prompt=prompt, size_str=size_str, sec=sec)



@app.post("/generate", response_model=schemas.VideoResponse)
async def generate_video(background_tasks: BackgroundTasks,
                   video_in:schemas.VideoCreate=Depends(video_create_as_form),
                   image: Optional[UploadFile] = File(None),
                   db: Session = Depends(get_database),
                   current_user: models.User = Depends(auth.get_current_user)
                   ):
    image_str = None
    if image:
        image_data = await image.read()
        image_str= base64.b64encode(image_data).decode('utf-8')

    db_video = models.VideoGeneration(
        prompt=video_in.prompt,
        status = "processing",
        user_id=current_user.id
    )
    db.add(db_video)
    db.commit()
    db.refresh(db_video)
    print(video_in.size_str)

    background_tasks.add_task(
        run_azure,
        db_video.id,
        video_in.prompt,
        video_in.size_str,
        video_in.sec,
        image_str
    )
    return db_video


@app.get("/videos/{video_id}", response_model=schemas.VideoResponse)
def get_video_status(
    video_id: int, 
    db: Session = Depends(get_database),
    current_user: models.User = Depends(auth.get_current_user)
):
    video = db.query(models.VideoGeneration).filter(
        models.VideoGeneration.id == video_id,
        models.VideoGeneration.user_id == current_user.id
    ).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
        
    return video

@app.get("/videos/{video_id}/stream")
async def secure_vidstream(video_id: int, db:Session = Depends(get_database),
                           current_user: models.User = Depends(auth.get_current_user)
                           ):
    video = db.query(models.VideoGeneration).filter(
        models.VideoGeneration.id == video_id).first()
     
    if not video or not video.video_url:
        raise HTTPException(status_code=404, detail="Video not found or not ready")
    print(f"DEBUG: Found video! URL is {video.video_url}")
    
    secure_url = f"{video.video_url}?api-version=preview&api-key={videogen.SORA_KEY}"

    def generate_stream():
        with requests.get(secure_url, stream=True) as r:
            r.raise_for_status()
            for chunk in r.iter_content(chunk_size=8192):
                yield chunk

    return StreamingResponse(generate_stream(), media_type="video/mp4")


@app.get("/videos", response_model=list[schemas.VideoResponse])
def get_user_videos(
    db: Session = Depends(get_database),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Fetch all videos for the user, newest first
    videos = db.query(models.VideoGeneration).filter(
        models.VideoGeneration.user_id == current_user.id
    ).order_by(models.VideoGeneration.created_at.desc()).all()
    
    return videos