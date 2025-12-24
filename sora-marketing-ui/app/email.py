import resend
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=r"app\.env")
resend.api_key = os.getenv("RESENDAPIKEY")


def send_verification_email(email: str, token:str):
    params = {
    "from": "onboarding@resend.dev",
    "to": email,
    "subject": "Verify Your Email ",
    "html": f"<strong>Click <a href='http://localhost:8000/verify?token={token}'>here</a> to verify your account.</strong>",
    }
    resend.Emails.send(params)
