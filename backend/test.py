import os
import requests
from dotenv import load_dotenv

load_dotenv(dotenv_path=r"backend\.env")

SORA_ENDPOINT= os.getenv("SORA_ENDPOINT")
SORA_KEY= os.getenv("SORA_KEY")

response = requests.get(SORA_ENDPOINT, headers={"api-key": SORA_KEY})
print(response.status_code)
print(response.text)